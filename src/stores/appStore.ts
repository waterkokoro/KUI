import { create } from "zustand";
import type { Settings, Profile, User } from "../types";

interface AppState {
  ready: boolean;
  appDataDir: string;
  settings: Settings;
  currentTopicId: string | null;
  currentUserId: string | null;
  currentUser: User | null;
  currentProfileId: string | null;
  profiles: Profile[];
  treeReloadKey: number;
  locateTopicKey: number;
  view: "chat" | "graph" | "settings";
  settingsTab: string;
  profilesAutoCreate: boolean;
  setReady(v: boolean): void;
  setAppDataDir(d: string): void;
  setSettings(s: Settings): void;
  setCurrentTopic(id: string | null): void;
  setCurrentProfile(id: string | null): void;
  setCurrentUser(u: User | null): void;
  setProfiles(list: Profile[]): void;
  reloadTree(): void;
  locateInTree(): void;
  setView(v: AppState["view"], tab?: string): void;
  setSettingsTab(tab: string): void;
  requestProfileCreate(): void;
  clearProfileCreate(): void;
}

export const useAppStore = create<AppState>((set) => ({
  ready: false,
  appDataDir: "",
  settings: {
    startup_mode: "last",
    last_topic_id: null,
    last_profile_id: null,
    theme: "dark",
    language: "zh-CN",
    default_agent_id: null,
    default_model_ref: null,
    search_provider: "auto",
    search_api_keys: {},
  },
  currentTopicId: null,
  currentUserId: null,
  currentUser: null,
  currentProfileId: null,
  profiles: [],
  treeReloadKey: 0,
  locateTopicKey: 0,
  view: "chat",
  settingsTab: "general",
  profilesAutoCreate: false,
  setReady: (v) => set({ ready: v }),
  setAppDataDir: (d) => set({ appDataDir: d }),
  setSettings: (s) => set({ settings: s }),
  setCurrentTopic: (id) => set({ currentTopicId: id }),
  setCurrentProfile: (id) => set((s) => ({
    currentProfileId: id,
    currentTopicId: null,
    treeReloadKey: s.treeReloadKey + 1,
  })),
  setCurrentUser: (u) => set({ currentUser: u }),
  setProfiles: (list) => set({ profiles: list }),
  reloadTree: () => set((s) => ({ treeReloadKey: s.treeReloadKey + 1 })),
  locateInTree: () => set((s) => ({ locateTopicKey: s.locateTopicKey + 1 })),
  setView: (v, tab) => set({ view: v, ...(tab ? { settingsTab: tab } : {}) }),
  setSettingsTab: (tab) => set({ settingsTab: tab }),
  requestProfileCreate: () => set({ view: "settings", settingsTab: "profiles", profilesAutoCreate: true }),
  clearProfileCreate: () => set({ profilesAutoCreate: false }),
}));
