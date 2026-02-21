import { useState } from "react";

export function UrlCodecTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const handleEncode = () => {
    try {
      setOutput(encodeURIComponent(input));
    } catch (e) {
      setOutput(`编码错误: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleDecode = () => {
    try {
      setOutput(decodeURIComponent(input));
    } catch (e) {
      setOutput(`解码错误: ${e instanceof Error ? e.message : 'Invalid URL encoding'}`);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">URL 编解码</h2>
      <div className="flex gap-2">
        <button onClick={handleEncode} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          编码
        </button>
        <button onClick={handleDecode} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          解码
        </button>
      </div>
      <textarea
        className="w-full h-32 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="输入 URL..."
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