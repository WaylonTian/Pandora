import { useState } from "react";

export function JsonTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed, null, 2));
    } catch (e) {
      setOutput(`Error: ${e instanceof Error ? e.message : 'Invalid JSON'}`);
    }
  };

  const handleCompress = () => {
    try {
      const parsed = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
    } catch (e) {
      setOutput(`Error: ${e instanceof Error ? e.message : 'Invalid JSON'}`);
    }
  };

  const handleValidate = () => {
    try {
      JSON.parse(input);
      setOutput("✅ Valid JSON");
    } catch (e) {
      setOutput(`❌ Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}`);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">JSON 工具</h2>
      <div className="flex gap-2">
        <button onClick={handleFormat} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          格式化
        </button>
        <button onClick={handleCompress} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          压缩
        </button>
        <button onClick={handleValidate} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          验证
        </button>
      </div>
      <textarea
        className="w-full h-32 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="输入 JSON..."
      />
      <textarea
        className="w-full h-32 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={output}
        readOnly
        placeholder="输出..."
      />
    </div>
  );
}