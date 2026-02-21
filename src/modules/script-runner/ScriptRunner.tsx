import { useEffect } from "react";
import { useScriptRunnerStore } from "./store";
import Editor from "@monaco-editor/react";

export function ScriptRunner() {
  const store = useScriptRunnerStore();
  const activeScript = store.scripts.find(s => s.id === store.activeScriptId);

  useEffect(() => { store.loadRuntimes(); }, []);

  const handleNew = () => {
    store.addScript({ name: "New Script", runtime: "node", content: "" });
  };

  const handleRun = async () => {
    if (!activeScript) return;
    try {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const { tempDir } = await import("@tauri-apps/api/path");
      const ext = getExt(activeScript.runtime);
      const path = `${await tempDir()}pandora_${activeScript.id}${ext}`;
      await writeTextFile(path, activeScript.content);
      await store.runScript({ ...activeScript, filePath: path });
    } catch (e) {
      console.error("Failed to run script:", e);
    }
  };

  return (
    <div className="flex h-full bg-background text-foreground">
      <div className="w-48 border-r border-border p-2 flex flex-col shrink-0">
        <button onClick={handleNew} className="mb-2 px-2 py-1 bg-primary text-primary-foreground rounded text-sm">
          + New Script
        </button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {store.scripts.map(s => (
            <div
              key={s.id}
              onClick={() => store.setActiveScript(s.id)}
              className={`px-2 py-1.5 rounded text-sm cursor-pointer flex justify-between items-center ${
                store.activeScriptId === s.id ? "bg-accent" : "hover:bg-accent/50"
              }`}
            >
              <span className="truncate">{s.name}</span>
              <span className="text-xs text-muted-foreground">{s.runtime}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {activeScript ? (
          <>
            <div className="flex items-center gap-2 p-2 border-b border-border">
              <input
                className="bg-transparent border border-border rounded px-2 py-1 text-sm"
                value={activeScript.name}
                onChange={e => store.updateScript(activeScript.id, { name: e.target.value })}
              />
              <select
                className="bg-background border border-border rounded px-2 py-1 text-sm"
                value={activeScript.runtime}
                onChange={e => store.updateScript(activeScript.id, { runtime: e.target.value })}
              >
                {store.runtimes.filter(r => r.available).map(r => (
                  <option key={r.command} value={r.command}>{r.name}</option>
                ))}
                <option value="node">Node.js</option>
                <option value="python">Python</option>
                <option value="powershell">PowerShell</option>
                <option value="bash">Bash</option>
              </select>
              <button
                onClick={handleRun}
                disabled={store.isRunning}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                {store.isRunning ? "Running..." : "▶ Run"}
              </button>
              <button
                onClick={() => store.removeScript(activeScript.id)}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 ml-auto"
              >
                Delete
              </button>
            </div>

            <div className="flex-1">
              <Editor
                height="100%"
                language={getLanguage(activeScript.runtime)}
                value={activeScript.content}
                onChange={v => store.updateScript(activeScript.id, { content: v || "" })}
                theme="vs-dark"
                options={{ minimap: { enabled: false }, fontSize: 14 }}
              />
            </div>

            {store.lastResult && (
              <div className="h-48 border-t border-border overflow-auto p-2 font-mono text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className={store.lastResult.exit_code === 0 ? "text-green-500" : "text-red-500"}>
                    Exit: {store.lastResult.exit_code}
                  </span>
                  <span className="text-muted-foreground">{store.lastResult.duration_ms}ms</span>
                </div>
                {store.lastResult.stdout && <pre className="whitespace-pre-wrap">{store.lastResult.stdout}</pre>}
                {store.lastResult.stderr && <pre className="whitespace-pre-wrap text-red-400">{store.lastResult.stderr}</pre>}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select or create a script
          </div>
        )}
      </div>
    </div>
  );
}

function getLanguage(runtime: string): string {
  switch (runtime) {
    case "node": case "javascript": case "js": return "javascript";
    case "python": case "py": return "python";
    case "powershell": case "pwsh": return "powershell";
    case "bash": case "sh": return "shell";
    default: return "plaintext";
  }
}

function getExt(runtime: string): string {
  switch (runtime) {
    case "node": case "js": return ".js";
    case "python": case "py": return ".py";
    case "powershell": case "pwsh": return ".ps1";
    case "bash": case "sh": return ".sh";
    default: return ".txt";
  }
}