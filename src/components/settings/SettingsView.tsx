import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Key, Monitor, Palette, Info } from "lucide-react";

type SettingsTab = "general" | "providers" | "appearance" | "about";

const TABS: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: "general", label: "General", icon: <Monitor size={14} /> },
  { id: "providers", label: "Providers", icon: <Key size={14} /> },
  { id: "appearance", label: "Appearance", icon: <Palette size={14} /> },
  { id: "about", label: "About", icon: <Info size={14} /> },
];

export function SettingsView() {
  const [tab, setTab] = useState<SettingsTab>("general");

  return (
    <div className="flex h-full">
      {/* Tab list */}
      <div className="w-48 border-r border-nexus-border bg-nexus-surface p-3 space-y-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
              tab === t.id
                ? "bg-nexus-accent/10 text-nexus-accent"
                : "text-nexus-text-muted hover:bg-nexus-bg hover:text-nexus-text"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6">
        {tab === "general" && <GeneralSettings />}
        {tab === "providers" && <ProviderSettings />}
        {tab === "appearance" && <AppearanceSettings />}
        {tab === "about" && <AboutSettings />}
      </div>
    </div>
  );
}

function GeneralSettings() {
  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-sm font-semibold">General Settings</h2>
      <SettingRow label="Default view on startup" description="Which view to show when Nexus launches">
        <select className="input text-xs">
          <option>Chat</option>
          <option>Editor</option>
          <option>Terminal</option>
        </select>
      </SettingRow>
      <SettingRow label="Auto-save editor files" description="Automatically save files after edits">
        <input type="checkbox" className="accent-nexus-accent" />
      </SettingRow>
      <SettingRow label="Memory persistence" description="Store memory entries to disk">
        <input type="checkbox" defaultChecked className="accent-nexus-accent" />
      </SettingRow>
    </div>
  );
}

function ProviderSettings() {
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    invoke("keyring_get_key", {
      service: "nexus",
      account: "anthropic",
    })
      .then((v: unknown) => {
        if (v && typeof v === "object" && "Some" in v) {
          setAnthropicKey((v as { Some: string }).Some);
        }
      })
      .catch(() => {});
    invoke("keyring_get_key", {
      service: "nexus",
      account: "openai",
    })
      .then((v: unknown) => {
        if (v && typeof v === "object" && "Some" in v) {
          setOpenaiKey((v as { Some: string }).Some);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    try {
      if (anthropicKey) {
        await invoke("keyring_set_key", {
          service: "nexus",
          account: "anthropic",
          secret: anthropicKey,
        });
      } else {
        await invoke("keyring_delete_key", {
          service: "nexus",
          account: "anthropic",
        }).catch(() => {});
      }
      if (openaiKey) {
        await invoke("keyring_set_key", {
          service: "nexus",
          account: "openai",
          secret: openaiKey,
        });
      } else {
        await invoke("keyring_delete_key", {
          service: "nexus",
          account: "openai",
        }).catch(() => {});
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save keys:", e);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-sm font-semibold">AI Provider Settings</h2>
      <SettingRow label="Anthropic API Key" description="Used for Claude models (stored in OS keychain)">
        <input
          type="password"
          value={anthropicKey}
          onChange={(e) => setAnthropicKey(e.target.value)}
          placeholder="sk-ant-..."
          className="input text-xs w-72"
        />
      </SettingRow>
      <SettingRow label="OpenAI API Key" description="Used for GPT models (stored in OS keychain)">
        <input
          type="password"
          value={openaiKey}
          onChange={(e) => setOpenaiKey(e.target.value)}
          placeholder="sk-..."
          className="input text-xs w-72"
        />
      </SettingRow>
      <SettingRow label="Ollama endpoint" description="Local Ollama server URL">
        <input
          type="text"
          value={ollamaUrl}
          onChange={(e) => setOllamaUrl(e.target.value)}
          className="input text-xs w-72"
        />
      </SettingRow>
      <div className="flex items-center gap-3 pt-2">
        <button onClick={handleSave} className="btn-primary text-xs">
          Save Keys
        </button>
        {saved && (
          <span className="text-[10px] text-green-400">Saved to keychain</span>
        )}
      </div>
      <p className="text-[10px] text-nexus-text-muted">
        API keys are stored in the OS keychain and never sent to third parties.
      </p>
    </div>
  );
}

function AppearanceSettings() {
  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-sm font-semibold">Appearance</h2>
      <SettingRow label="Theme" description="Choose your preferred theme">
        <select className="input text-xs">
          <option>Dark</option>
          <option disabled>Light (coming soon)</option>
        </select>
      </SettingRow>
      <SettingRow label="Font size" description="Base font size for the UI">
        <select className="input text-xs">
          <option>Small</option>
          <option>Medium</option>
          <option>Large</option>
        </select>
      </SettingRow>
      <SettingRow label="Show status bar" description="Display connection status at the bottom">
        <input type="checkbox" defaultChecked className="accent-nexus-accent" />
      </SettingRow>
    </div>
  );
}

function AboutSettings() {
  return (
    <div className="space-y-4 max-w-lg">
      <h2 className="text-sm font-semibold">About Nexus</h2>
      <div className="bg-nexus-surface border border-nexus-border rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium">Nexus v0.1.0</p>
        <p className="text-xs text-nexus-text-muted">
          A personal IDE that unifies MCP servers, AI agents, and multi-model chat into one interface.
        </p>
        <div className="text-[10px] text-nexus-text-muted space-y-1 pt-2">
          <p>Built with Tauri 2 + React + Rust</p>
          <p>Source: github.com/Daymrens/Nexus</p>
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-nexus-text-muted">{description}</p>
      </div>
      {children}
    </div>
  );
}
