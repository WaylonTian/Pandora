import { create } from "zustand";
import { zh } from "./zh";
import { en } from "./en";

export type Locale = "zh" | "en";
type Messages = typeof zh;

const locales: Record<Locale, Messages> = { zh, en };

interface I18nState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useI18nStore = create<I18nState>((set) => {
  const stored = localStorage.getItem("pandora-locale");
  const locale: Locale = stored === "en" ? "en" : "zh";
  return {
    locale,
    setLocale: (l) => {
      localStorage.setItem("pandora-locale", l);
      set({ locale: l });
    },
  };
});

export function t(key: string, params?: Record<string, string | number>): string {
  const { locale } = useI18nStore.getState();
  const msgs = locales[locale] as Record<string, string>;
  let msg = msgs[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return msg;
}

export function useT() {
  const locale = useI18nStore((s) => s.locale);
  return (key: string, params?: Record<string, string | number>): string => {
    const msgs = locales[locale] as Record<string, string>;
    let msg = msgs[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        msg = msg.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return msg;
  };
}
