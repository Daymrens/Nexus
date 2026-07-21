import { useState } from "react";
import { useAgentStore } from "../../stores/agentStore";

export function SpawnAgentForm() {
  const { spawnAgent, setShowSpawnForm } = useAgentStore();
  const [name, setName] = useState("");
  const [role, setRole] = useState("assistant");
  const [task, setTask] = useState("");
  const [command, setCommand] = useState("");

  const handleSpawn = async () => {
    if (!name || !task || !command) return;
    const cmd = command.split(" ").filter(Boolean);
    await spawnAgent({ name, role, task, command: cmd });
    setName("");
    setRole("assistant");
    setTask("");
    setCommand("");
  };

  return (
    <div className="p-3 space-y-2 border-b border-nexus-border">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Agent name"
        className="input text-xs"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="input text-xs"
      >
        <option value="assistant">Assistant</option>
        <option value="coder">Coder</option>
        <option value="reviewer">Reviewer</option>
        <option value="researcher">Researcher</option>
        <option value="planner">Planner</option>
      </select>
      <input
        value={task}
        onChange={(e) => setTask(e.target.value)}
        placeholder="Task description"
        className="input text-xs"
      />
      <input
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        placeholder="Command (e.g. python agent.py --task ...)"
        className="input text-xs"
      />
      <div className="flex gap-2">
        <button onClick={handleSpawn} className="btn-primary flex-1 text-xs">
          Spawn
        </button>
        <button
          onClick={() => setShowSpawnForm(false)}
          className="btn-secondary flex-1 text-xs"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
