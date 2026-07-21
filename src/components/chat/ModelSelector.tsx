import { useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import type { ProviderConfig, ProviderType } from "../../stores/chatStore";

interface Props {
  current: ProviderConfig;
  onChange: (config: ProviderConfig) => void;
  onClose: () => void;
}

const PROVIDER_MODELS: Record<ProviderType, { label: string; models: string[] }> = {
  anthropic: {
    label: "Anthropic",
    models: [
      "claude-sonnet-4-20250514",
      "claude-opus-4-20250514",
      "claude-3-5-haiku-20241022",
    ],
  },
  openai: {
    label: "OpenAI",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o3-mini"],
  },
  ollama: {
    label: "Ollama (Local)",
    models: ["llama3.2", "codellama", "deepseek-coder", "mistral"],
  },
};

export function ModelSelector({ current, onChange, onClose }: Props) {
  const [showKey, setShowKey] = useState(false);
  const [localConfig, setLocalConfig] = useState({ ...current });

  const handleProviderChange = (type: ProviderType) => {
    const defaults: Record<ProviderType, ProviderConfig> = {
      anthropic: { type: "anthropic", apiKey: "", model: "claude-sonnet-4-20250514" },
      openai: { type: "openai", apiKey: "", model: "gpt-4o" },
      ollama: { type: "ollama", apiKey: "ollama", model: "llama3.2", baseUrl: "http://localhost:11434/v1" },
    };
    setLocalConfig(defaults[type]);
  };

  const handleSave = () => {
    onChange(localConfig);
    onClose();
  };

  const needsKey = localConfig.type !== "ollama";

  return (
    <div className="border-b border-nexus-border bg-nexus-surface p-3">
      <div className="max-w-lg mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold">Model Settings</h3>
          <button onClick={onClose} className="text-nexus-text-muted hover:text-nexus-text">
            <X size={14} />
          </button>
        </div>

        {/* Provider tabs */}
        <div className="flex gap-1">
          {(Object.keys(PROVIDER_MODELS) as ProviderType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleProviderChange(type)}
              className={`px-3 py-1.5 rounded text-xs transition-colors ${
                localConfig.type === type
                  ? "bg-nexus-accent text-white"
                  : "bg-nexus-bg text-nexus-text-muted hover:text-nexus-text"
              }`}
            >
              {PROVIDER_MODELS[type].label}
            </button>
          ))}
        </div>

        {/* Model dropdown */}
        <div>
          <label className="text-[10px] text-nexus-text-muted uppercase tracking-wider">
            Model
          </label>
          <select
            value={localConfig.model}
            onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
            className="input mt-1 w-full text-xs"
          >
            {PROVIDER_MODELS[localConfig.type].models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* API Key */}
        {needsKey && (
          <div>
            <label className="text-[10px] text-nexus-text-muted uppercase tracking-wider">
              API Key
            </label>
            <div className="relative mt-1">
              <input
                type={showKey ? "text" : "password"}
                value={localConfig.apiKey}
                onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
                placeholder={`Enter ${localConfig.type} API key`}
                className="input w-full pr-8 text-xs"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-nexus-text-muted hover:text-nexus-text"
              >
                {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          </div>
        )}

        {/* Base URL (optional) */}
        {localConfig.type === "ollama" && (
          <div>
            <label className="text-[10px] text-nexus-text-muted uppercase tracking-wider">
              Base URL
            </label>
            <input
              value={localConfig.baseUrl || ""}
              onChange={(e) => setLocalConfig({ ...localConfig, baseUrl: e.target.value })}
              placeholder="http://localhost:11434/v1"
              className="input mt-1 w-full text-xs"
            />
          </div>
        )}

        <button onClick={handleSave} className="btn-primary w-full text-xs">
          Save
        </button>
      </div>
    </div>
  );
}
