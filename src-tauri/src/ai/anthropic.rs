use crate::ai::{AiMessage, AiToolDefinition, StreamEvent};
use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::Emitter;

#[derive(Debug, Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<AnthropicMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tools: Vec<AnthropicTool>,
    stream: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct AnthropicMessage {
    role: String,
    content: serde_json::Value,
}

#[derive(Debug, Serialize)]
struct AnthropicTool {
    name: String,
    description: String,
    input_schema: serde_json::Value,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum AnthropicStreamEvent {
    #[serde(rename = "content_block_start")]
    ContentBlockStart {
        index: usize,
        content_block: ContentBlock,
    },
    #[serde(rename = "content_block_delta")]
    ContentBlockDelta {
        index: usize,
        delta: Delta,
    },
    #[serde(rename = "content_block_stop")]
    ContentBlockStop { index: usize },
    #[serde(rename = "message_delta")]
    MessageDelta { delta: MessageDelta },
    #[serde(rename = "message_stop")]
    MessageStop,
    #[serde(rename = "error")]
    Error { error: ApiError },
    #[serde(other)]
    Other,
}

#[derive(Debug, Deserialize)]
struct ContentBlock {
    #[serde(rename = "type")]
    block_type: String,
    text: Option<String>,
    name: Option<String>,
    id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Delta {
    #[serde(rename = "type")]
    delta_type: String,
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct MessageDelta {
    stop_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ApiError {
    message: String,
}

fn convert_messages(messages: &[AiMessage]) -> Vec<AnthropicMessage> {
    messages
        .iter()
        .map(|m| {
            let content = if let Some(ref tool_calls) = m.tool_calls {
                let mut blocks: Vec<serde_json::Value> = vec![serde_json::json!({
                    "type": "text",
                    "text": m.content
                })];
                for tc in tool_calls {
                    blocks.push(serde_json::json!({
                        "type": "tool_use",
                        "id": tc.id,
                        "name": tc.function.name,
                        "input": serde_json::from_str::<serde_json::Value>(&tc.function.arguments)
                            .unwrap_or_default()
                    }));
                }
                serde_json::Value::Array(blocks)
            } else if m.role == "tool" {
                serde_json::json!([{
                    "type": "tool_result",
                    "tool_use_id": m.tool_call_id.as_deref().unwrap_or(""),
                    "content": m.content
                }])
            } else {
                serde_json::Value::String(m.content.clone())
            };

            AnthropicMessage {
                role: if m.role == "tool" {
                    "user".to_string()
                } else {
                    m.role.clone()
                },
                content,
            }
        })
        .collect()
}

pub async fn stream_anthropic(
    api_key: &str,
    model: &str,
    base_url: &str,
    messages: &[AiMessage],
    tools: &[AiToolDefinition],
    max_tokens: u32,
    system_prompt: Option<&str>,
    app: tauri::AppHandle,
    _conversation_id: String,
) -> Result<String, String> {
    let client = Client::new();

    let anthropic_tools: Vec<AnthropicTool> = tools
        .iter()
        .map(|t| AnthropicTool {
            name: t.name.clone(),
            description: t.description.clone(),
            input_schema: t.input_schema.clone(),
        })
        .collect();

    let request = AnthropicRequest {
        model: model.to_string(),
        max_tokens,
        messages: convert_messages(messages),
        system: system_prompt.map(|s| s.to_string()),
        tools: anthropic_tools,
        stream: true,
    };

    let url = format!("{}/v1/messages", base_url);

    let response = client
        .post(&url)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("API error {}: {}", status, body));
    }

    let mut stream = response.bytes_stream();
    let mut full_text = String::new();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].trim().to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            if line.is_empty() || !line.starts_with("data: ") {
                continue;
            }

            let data = &line[6..];
            if data == "[DONE]" {
                break;
            }

            if let Ok(event) = serde_json::from_str::<AnthropicStreamEvent>(data) {
                match event {
                    AnthropicStreamEvent::ContentBlockDelta { delta, .. } => {
                        if delta.delta_type == "text_delta" {
                            if let Some(text) = delta.text {
                                full_text.push_str(&text);
                                let _ = app.emit(
                                    "chat://token",
                                    StreamEvent {
                                        event_type: "token".to_string(),
                                        content: text,
                                        done: false,
                                    },
                                );
                            }
                        }
                    }
                    AnthropicStreamEvent::Error { error } => {
                        return Err(error.message);
                    }
                    _ => {}
                }
            }
        }
    }

    let _ = app.emit(
        "chat://token",
        StreamEvent {
            event_type: "done".to_string(),
            content: String::new(),
            done: true,
        },
    );

    Ok(full_text)
}
