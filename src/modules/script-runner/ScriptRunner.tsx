import { useEffect } from "react";
import { useScriptRunnerStore } from "./store";
import { useThemeStore } from "@/stores/theme";
import Editor from "@monaco-editor/react";

export function ScriptRunner() {
  const store = useScriptRunnerStore();
  const { isDark } = useThemeStore();
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
      {/* Script list sidebar */}
      <div className="w-52 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-3 border-b border-border">
          <button
            onClick={handleNew}
            className="w-full px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity duration-150 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            + New Script
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {store.scripts.map(s => (
            <div
              key={s.id}
              onClick={() => store.setActiveScript(s.id)}
              className={`px-3 py-2 rounded-md text-sm cursor-pointer flex justify-between items-center transition-colors duration-150 ${
                store.activeScriptId === s.id
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "hover:bg-muted/50 text-foreground"
              }`}
            >
              <span className="truncate font-medium">{s.name}</span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">{s.runtime}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeScript ? (
          <>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card">
              <input
                className="bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
                value={activeScript.name}
                onChange={e => store.updateScript(activeScript.id, { name: e.target.value })}
              />
              <select
                className="bg-background border border-border rounded-md px-3 py-1.5 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
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
                className="px-4 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium cursor-pointer hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-green-500/50"
              >
                {store.isRunning ? "Running..." : "▶ Run"}
              </button>
              <div className="flex-1" />
              <button
                onClick={() => store.removeScript(activeScript.id)}
                className="px-3 py-1.5 text-destructive border border-destructive/30 rounded-md text-sm cursor-pointer hover:bg-destructive/10 transition-colors duration-150 focus:outline-none"
              >
                Delete
              </button>
            </div>

            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                language={getLanguage(activeScript.runtime)}
                value={activeScript.content}
                onChange={v => store.updateScript(activeScript.id, { content: v || "" })}
                theme={isDark ? "vs-dark" : "light"}
                options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", padding: { top: 12 } }}
              />
            </div>

            {store.lastResult && (
              <div className="h-48 border-t border-border overflow-auto p-3 font-mono text-xs bg-card">
                <div className="flex items-center gap-3 mb-2 pb-2 border-b border-border">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${store.lastResult.exit_code === 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                    Exit: {store.lastResult.exit_code}
                  </span>
                  <span className="text-muted-foreground">{store.lastResult.duration_ms}ms</span>
                </div>
                {store.lastResult.stdout && <pre className="whitespace-pre-wrap text-foreground">{store.lastResult.stdout}</pre>}
                {store.lastResult.stderr && <pre className="whitespace-pre-wrap text-red-400">{store.lastResult.stderr}</pre>}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <svg viewBox="0 0 24 24" className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <p className="text-sm">Select or create a script</p>
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
