import { useState } from "react";

export function CryptoTool() {
  const [input, setInput] = useState("");
  const [algorithm, setAlgorithm] = useState("SHA-256");
  const [output, setOutput] = useState("");

  const handleHash = async () => {
    if (!input) {
      setOutput("请输入要哈希的文本");
      return;
    }

    try {
      if (algorithm === "MD5") {
        setOutput("MD5 需要额外库支持，请使用 SHA 算法");
        return;
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest(algorithm, data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      setOutput(hashHex);
    } catch (e) {
      setOutput(`哈希错误: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">哈希生成器</h2>
      <div className="flex gap-2 items-center">
        <select
          value={algorithm}
          onChange={e => setAlgorithm(e.target.value)}
          className="px-2 py-1 border rounded bg-background text-foreground"
        >
          <option value="SHA-1">SHA-1</option>
          <option value="SHA-256">SHA-256</option>
          <option value="SHA-384">SHA-384</option>
          <option value="SHA-512">SHA-512</option>
          <option value="MD5">MD5 (不支持)</option>
        </select>
        <button onClick={handleHash} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          生成哈希
        </button>
      </div>
      <textarea
        className="w-full h-32 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="输入要哈希的文本..."
      />
      <textarea
        className="w-full h-20 p-2 border rounded bg-background text-foreground font-mono text-sm resize-y"
        value={output}
        readOnly
        placeholder="哈希结果..."
      />
    </div>
  );
}