import { create } from "zustand";

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>((set) => {
  const stored = localStorage.getItem("pandora-theme");
  const isDark = stored ? stored === "dark" : true; // default dark
  document.documentElement.classList.toggle("dark", isDark);
  return {
    isDark,
    toggle: () => set((state) => {
      const next = !state.isDark;
      localStorage.setItem("pandora-theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return { isDark: next };
    }),
  };
});