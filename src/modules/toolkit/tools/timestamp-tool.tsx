import { useState, useEffect } from "react";

export function TimestampTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = Date.now();
      setCurrentTime(`当前时间戳: ${now} (${new Date(now).toLocaleString()})`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToDate = () => {
    const timestamp = parseInt(input);
    if (isNaN(timestamp)) {
      setOutput("请输入有效的时间戳");
      return;
    }
    const date = new Date(timestamp.toString().length === 10 ? timestamp * 1000 : timestamp);
    setOutput(date.toLocaleString());
  };

  const handleToTimestamp = () => {
    const date = new Date(input);
    if (isNaN(date.getTime())) {
      setOutput("请输入有效的日期格式");
      return;
    }
    setOutput(Math.floor(date.getTime() / 1000).toString());
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">时间戳转换</h2>
      <div className="text-sm text-muted-foreground">{currentTime}</div>
      <div className="flex gap-2">
        <button onClick={handleToDate} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          转为日期
        </button>
        <button onClick={handleToTimestamp} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          转为时间戳
        </button>
      </div>
      <input
        className="w-full p-2 border rounded bg-background text-foreground"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="输入时间戳或日期..."
      />
      <div className="p-2 border rounded bg-muted font-mono text-sm min-h-[2.5rem]">
        {output || "输出..."}
      </div>
    </div>
  );
}