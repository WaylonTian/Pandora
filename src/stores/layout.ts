import { create } from "zustand";

interface LayoutState {
  serializedLayout: unknown | null;
  saveLayout: (layout: unknown) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  serializedLayout: JSON.parse(localStorage.getItem("pandora-layout") || "null"),
  saveLayout: (layout) => {
    localStorage.setItem("pandora-layout", JSON.stringify(layout));
    set({ serializedLayout: layout });
  },
}));