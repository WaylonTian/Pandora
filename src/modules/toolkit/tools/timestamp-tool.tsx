import { useState, useEffect } from "react";
import { useT } from '@/i18n';
import { CopyButton } from '../components/CopyButton';

export function TimestampTool() {
  const t = useT();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = Date.now();
      setCurrentTime(`${t("toolkit.timestampTool.currentTimestamp")}: ${now} (${new Date(now).toLocaleString()})`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [t]);

  const handleToDate = () => {
    const timestamp = parseInt(input);
    if (isNaN(timestamp)) {
      setOutput(t("toolkit.timestampTool.invalidTimestamp"));
      return;
    }
    const date = new Date(timestamp.toString().length === 10 ? timestamp * 1000 : timestamp);
    setOutput(date.toLocaleString());
  };

  const handleToTimestamp = () => {
    const date = new Date(input);
    if (isNaN(date.getTime())) {
      setOutput(t("toolkit.timestampTool.invalidDate"));
      return;
    }
    setOutput(Math.floor(date.getTime() / 1000).toString());
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{t("toolkit.timestampTool.title")}</h2>
      <div className="text-sm text-muted-foreground">{currentTime}</div>
      <div className="flex gap-2">
        <button onClick={handleToDate} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          {t("toolkit.timestampTool.toDate")}
        </button>
        <button onClick={handleToTimestamp} className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
          {t("toolkit.timestampTool.toTimestamp")}
        </button>
      </div>
      <input
        className="w-full p-2 border rounded bg-background text-foreground"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={t("toolkit.timestampTool.inputPlaceholder")}
      />
      <div className="relative p-2 border rounded bg-muted font-mono text-sm min-h-[2.5rem]">
        {output || t("toolkit.timestampTool.outputPlaceholder")}
        {output && <div className="absolute top-2 right-2"><CopyButton text={output} /></div>}
      </div>
    </div>
  );
}