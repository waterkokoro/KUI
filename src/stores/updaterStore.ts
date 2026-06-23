import { create } from "zustand";
import { checkForUpdates, downloadAndInstallUpdate, type UpdateInfo } from "../ipc";

interface UpdaterState {
  checking: boolean;
  downloading: boolean;
  updateInfo: UpdateInfo | null;
  modalOpen: boolean;
  noUpdate: boolean; // true when manual check finds no update

  check: (silent?: boolean) => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  closeModal: () => void;
}

export const useUpdaterStore = create<UpdaterState>((set) => ({
  checking: false,
  downloading: false,
  updateInfo: null,
  modalOpen: false,
  noUpdate: false,

  check: async (silent = false) => {
    set({ checking: true, noUpdate: false });
    try {
      const info = await checkForUpdates();
      if (info) {
        set({ updateInfo: info, modalOpen: true, checking: false });
      } else {
        set({ checking: false, noUpdate: !silent });
      }
    } catch (err) {
      console.warn("[updater] check failed:", err);
      set({ checking: false });
    }
  },

  downloadAndInstall: async () => {
    set({ downloading: true });
    try {
      await downloadAndInstallUpdate();
      set({ downloading: false, modalOpen: false });
    } catch (err) {
      set({ downloading: false });
      throw err;
    }
  },

  closeModal: () => set({ modalOpen: false }),
}));
