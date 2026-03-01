import { useState } from "react";
import { useT } from "@/i18n";
import { TextOutput } from "../components/TextOutput";
import { ActionButton } from "../components/ActionBar";

const WORDS = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum".split(" ");

function gen(count: number, unit: "words" | "sentences" | "paragraphs") {
  const word = () => WORDS[Math.floor(Math.random() * WORDS.length)];
  const sentence = () => { const len = 8 + Math.floor(Math.random() * 12); const s = Array.from({ length: len }, word).join(" "); return s[0].toUpperCase() + s.slice(1) + "."; };
  const paragraph = () => Array.from({ length: 3 + Math.floor(Math.random() * 4) }, sentence).join(" ");
  if (unit === "words") return Array.from({ length: count }, word).join(" ");
  if (unit === "sentences") return Array.from({ length: count }, sentence).join(" ");
  return Array.from({ length: count }, paragraph).join("\n\n");
}

export function LoremTool() {
  const t = useT();
  const [count, setCount] = useState(3);
  const [unit, setUnit] = useState<"words" | "sentences" | "paragraphs">("paragraphs");
  const [output, setOutput] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <input type="number" min={1} max={100} value={count} onChange={e => setCount(+e.target.value)}
          className="w-20 px-2 py-1.5 border border-border rounded-md bg-background text-foreground text-sm" />
        <select value={unit} onChange={e => setUnit(e.target.value as typeof unit)}
          className="px-2 py-1.5 border border-border rounded-md bg-background text-foreground text-sm">
          <option value="words">{t("toolkit.loremTool.words")}</option>
          <option value="sentences">{t("toolkit.loremTool.sentences")}</option>
          <option value="paragraphs">{t("toolkit.loremTool.paragraphs")}</option>
        </select>
        <ActionButton onClick={() => setOutput(gen(count, unit))}>{t("toolkit.loremTool.generate")}</ActionButton>
      </div>
      <TextOutput value={output} rows={12} />
    </div>
  );
}
