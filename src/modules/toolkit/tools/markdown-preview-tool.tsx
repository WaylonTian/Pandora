import { useState, useMemo } from "react";
import { useT } from "@/i18n";
import { marked } from "marked";
import { TextInput } from "../components/TextInput";

export function MarkdownPreviewTool() {
  const t = useT();
  const [input, setInput] = useState("# Hello\n\n**Bold** and *italic*\n\n- List item 1\n- List item 2\n\n```js\nconsole.log('hello');\n```");
  const html = useMemo(() => { try { return marked.parse(input) as string; } catch { return ""; } }, [input]);

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      <TextInput value={input} onChange={setInput} placeholder={t("toolkit.markdownPreviewTool.placeholder")} rows={20} />
      <div className="border border-border rounded-lg bg-muted/30 p-4 overflow-auto prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
