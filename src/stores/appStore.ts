import { create } from "zustand";
import type { Settings } from "../types";

interface AppState {
  ready: boolean;
  appDataDir: string;
  settings: Settings;
  currentTopicId: string | null;
  treeReloadKey: number;
  view: "chat" | "graph" | "settings";
  setReady(v: boolean): void;
  setAppDataDir(d: string): void;
  setSettings(s: Settings): void;
  setCurrentTopic(id: string | null): void;
  reloadTree(): void;
  setView(v: AppState["view"]): void;
}

export const useAppStore = create<AppState>((set) => ({
  ready: false,
  appDataDir: "",
  settings: {
    startup_mode: "last",
    last_topic_id: null,
    theme: "dark",
    language: "zh-CN",
    default_agent_id: null,
    default_model_ref: null,
  },
  currentTopicId: null,
  treeReloadKey: 0,
  view: "chat",
  setReady: (v) => set({ ready: v }),
  setAppDataDir: (d) => set({ appDataDir: d }),
  setSettings: (s) => set({ settings: s }),
  setCurrentTopic: (id) => set({ currentTopicId: id }),
  reloadTree: () => set((s) => ({ treeReloadKey: s.treeReloadKey + 1 })),
  setView: (v) => set({ view: v }),
}));
