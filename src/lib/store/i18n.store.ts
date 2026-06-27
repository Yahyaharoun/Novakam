// src/lib/store/i18n.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import fr from "@/lib/i18n/fr.json";
import en from "@/lib/i18n/en.json";

export type Language = "fr" | "en";

const dictionaries = { fr, en };

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      language: "fr",
      setLanguage: (language) => set({ language }),
      t: (key: string) => {
        const { language } = get();
        const keys = key.split(".");
        let value: any = dictionaries[language];
        for (const k of keys) {
          if (value === undefined) break;
          value = value[k];
        }
        return (value as string) || key;
      },
    }),
    {
      name: "novakam-i18n",
      partialize: (state) => ({ language: state.language }),
    }
  )
);
