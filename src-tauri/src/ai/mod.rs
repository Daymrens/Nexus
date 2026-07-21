pub mod anthropic;
pub mod openai;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiMessage {
    pub role: String,
    pub content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Vec<ToolCall>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub call_type: String,
    pub function: FunctionCall,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionCall {
    pub name: String,
    pub arguments: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiToolDefinition {
    pub name: String,
    pub description: String,
    pub input_schema: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "provider")]
pub enum AiProviderConfig {
    #[serde(rename = "anthropic")]
    Anthropic {
        api_key: String,
        model: String,
        base_url: Option<String>,
    },
    #[serde(rename = "openai")]
    OpenAi {
        api_key: String,
        model: String,
        base_url: Option<String>,
    },
    #[serde(rename = "ollama")]
    Ollama {
        model: String,
        base_url: Option<String>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub provider: AiProviderConfig,
    pub messages: Vec<AiMessage>,
    #[serde(default)]
    pub tools: Vec<AiToolDefinition>,
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,
    #[serde(default)]
    pub system_prompt: Option<String>,
}

fn default_max_tokens() -> u32 {
    4096
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamEvent {
    pub event_type: String,
    pub content: String,
    pub done: bool,
}

pub async fn stream_chat(
    request: ChatRequest,
    app: tauri::AppHandle,
    conversation_id: String,
) -> Result<String, String> {
    match request.provider {
        AiProviderConfig::Anthropic {
            ref api_key,
            ref model,
            ref base_url,
        } => {
            anthropic::stream_anthropic(
                api_key,
                model,
                base_url.as_deref().unwrap_or("https://api.anthropic.com"),
                &request.messages,
                &request.tools,
                request.max_tokens,
                request.system_prompt.as_deref(),
                app,
                conversation_id,
            )
            .await
        }
        AiProviderConfig::OpenAi {
            ref api_key,
            ref model,
            ref base_url,
        } => {
            openai::stream_openai(
                api_key,
                model,
                base_url
                    .as_deref()
                    .unwrap_or("https://api.openai.com/v1"),
                &request.messages,
                &request.tools,
                request.max_tokens,
                request.system_prompt.as_deref(),
                app,
                conversation_id,
            )
            .await
        }
        AiProviderConfig::Ollama {
            ref model,
            ref base_url,
        } => {
            openai::stream_openai(
                "ollama",
                model,
                base_url
                    .as_deref()
                    .unwrap_or("http://localhost:11434/v1"),
                &request.messages,
                &request.tools,
                request.max_tokens,
                request.system_prompt.as_deref(),
                app,
                conversation_id,
            )
            .await
        }
    }
}
