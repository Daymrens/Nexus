use crate::ai::{AiMessage, AiToolDefinition, StreamEvent};
use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::Emitter;

#[derive(Debug, Serialize)]
struct OpenAiRequest {
    model: String,
    messages: Vec<OpenAiMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    tools: Vec<OpenAiTool>,
    stream: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAiMessage {
    role: String,
    content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_calls: Option<Vec<OpenAiToolCall>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    tool_call_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAiToolCall {
    id: String,
    #[serde(rename = "type")]
    call_type: String,
    function: OpenAiFunction,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAiFunction {
    name: String,
    arguments: String,
}

#[derive(Debug, Serialize)]
struct OpenAiTool {
    #[serde(rename = "type")]
    tool_type: String,
    function: OpenAiFunctionDef,
}

#[derive(Debug, Serialize)]
struct OpenAiFunctionDef {
    name: String,
    description: String,
    parameters: serde_json::Value,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum OpenAiStreamEvent {
    #[serde(rename = "message.start")]
    MessageStart { message: Option<MessageStart> },
    #[serde(rename = "content_block_delta")]
    ContentBlockDelta { delta: ContentDelta },
    #[serde(rename = "message_delta")]
    MessageDelta { delta: MessageDeltaData },
    #[serde(rename = "message_stop")]
    MessageStop,
    #[serde(rename = "error")]
    Error { error: ApiError },
    #[serde(other)]
    Other,
}

#[derive(Debug, Deserialize)]
struct MessageStart {
    role: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ContentDelta {
    #[serde(rename = "type")]
    delta_type: String,
    text: Option<String>,
    #[serde(rename = "index")]
    _index: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct MessageDeltaData {
    stop_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ApiError {
    message: String,
}

fn convert_messages(messages: &[AiMessage]) -> Vec<OpenAiMessage> {
    messages
        .iter()
        .map(|m| {
            let tool_calls = m.tool_calls.as_ref().map(|tcs| {
                tcs.iter()
                    .map(|tc| OpenAiToolCall {
                        id: tc.id.clone(),
                        call_type: "function".to_string(),
                        function: OpenAiFunction {
                            name: tc.function.name.clone(),
                            arguments: tc.function.arguments.clone(),
                        },
                    })
                    .collect()
            });

            OpenAiMessage {
                role: m.role.clone(),
                content: Some(m.content.clone()),
                tool_calls,
                tool_call_id: m.tool_call_id.clone(),
            }
        })
        .collect()
}

pub async fn stream_openai(
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

    let mut openai_messages: Vec<OpenAiMessage> = Vec::new();

    if let Some(sys) = system_prompt {
        openai_messages.push(OpenAiMessage {
            role: "system".to_string(),
            content: Some(sys.to_string()),
            tool_calls: None,
            tool_call_id: None,
        });
    }

    openai_messages.extend(convert_messages(messages));

    let openai_tools: Vec<OpenAiTool> = tools
        .iter()
        .map(|t| OpenAiTool {
            tool_type: "function".to_string(),
            function: OpenAiFunctionDef {
                name: t.name.clone(),
                description: t.description.clone(),
                parameters: t.input_schema.clone(),
            },
        })
        .collect();

    let request = OpenAiRequest {
        model: model.to_string(),
        messages: openai_messages,
        max_tokens: Some(max_tokens),
        tools: openai_tools,
        stream: true,
    };

    let url = format!("{}/chat/completions", base_url);

    let mut builder = client
        .post(&url)
        .header("content-type", "application/json");

    if api_key != "ollama" {
        builder = builder.bearer_auth(api_key);
    }

    let response = builder
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

            // Try OpenAI format first, then Anthropic format (for OpenRouter/proxy)
            if let Ok(event) = serde_json::from_str::<OpenAiStreamEvent>(data) {
                match event {
                    OpenAiStreamEvent::ContentBlockDelta { delta, .. } => {
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
                    OpenAiStreamEvent::Error { error } => {
                        return Err(error.message);
                    }
                    _ => {}
                }
            } else if let Ok(value) = serde_json::from_str::<serde_json::Value>(data) {
                // Fallback: parse generic SSE chunk
                if let Some(choices) = value.get("choices").and_then(|c| c.as_array()) {
                    for choice in choices {
                        if let Some(delta) = choice.get("delta") {
                            if let Some(content) =
                                delta.get("content").and_then(|c| c.as_str())
                            {
                                if !content.is_empty() {
                                    full_text.push_str(content);
                                    let _ = app.emit(
                                        "chat://token",
                                        StreamEvent {
                                            event_type: "token".to_string(),
                                            content: content.to_string(),
                                            done: false,
                                        },
                                    );
                                }
                            }
                        }
                    }
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
