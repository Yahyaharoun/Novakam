// src/lib/store/sync.store.ts
import { create } from "zustand";

export type SyncState = "idle" | "syncing" | "error" | "offline";

interface SyncStore {
  status: SyncState;
  pendingCount: number;
  lastSyncAt: Date | null;
  errorMessage: string | null;

  setStatus: (status: SyncState) => void;
  setPendingCount: (count: number) => void;
  setLastSyncAt: (date: Date) => void;
  setError: (msg: string | null) => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  status: "idle",
  pendingCount: 0,
  lastSyncAt: null,
  errorMessage: null,

  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
  setError: (errorMessage) => set({ errorMessage }),
}));
