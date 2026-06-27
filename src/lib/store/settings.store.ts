import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LocalPosSettings } from "@/lib/db/schema";

interface SettingsState {
  posSettings: LocalPosSettings | null;
  setPosSettings: (settings: LocalPosSettings) => void;
  updatePosSettings: (updates: Partial<LocalPosSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      posSettings: null,
      setPosSettings: (settings) => set({ posSettings: settings }),
      updatePosSettings: (updates) => 
        set((state) => ({
          posSettings: state.posSettings 
            ? { ...state.posSettings, ...updates } 
            : null
        })),
    }),
    {
      name: "novakam-settings",
    }
  )
);
