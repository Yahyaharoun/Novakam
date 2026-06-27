// src/lib/store/auth.store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@supabase/supabase-js";
import type { UserRole, Plan } from "@/lib/supabase/database.types";

interface Shop {
  id: string;
  name: string;
  slug: string;
  currency: string;
  language: string;
  logo_url: string | null;
  plan: Plan;
}

interface Subscription {
  id: string;
  plan: Plan;
  status: "active" | "trialing" | "past_due" | "canceled" | "paused";
  current_period_end: string;
  trial_ends_at: string | null;
}

interface AuthState {
  user: User | null;
  isSuperAdmin: boolean;
  currentShop: Shop | null;
  currentRole: UserRole | null;
  currentRegister: any | null;
  employeeName: string | null;
  shops: Shop[];
  subscription: Subscription | null;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setCurrentShop: (shop: Shop, role: UserRole) => void;
  setCurrentRegister: (register: any, employeeName: string) => void;
  setAuthContext: (
    user: User | null,
    shop: Shop | null,
    role: UserRole | null,
    shops: Shop[],
    subscription?: Subscription | null,
    isSuperAdmin?: boolean
  ) => void;
  setShops: (shops: Shop[]) => void;
  setSubscription: (sub: Subscription | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  user: null,
  isSuperAdmin: false,
  currentShop: null,
  currentRole: null,
  currentRegister: null,
  employeeName: null,
  shops: [],
  subscription: null,
  isLoading: true,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,
      setUser: (user) => set({ user }),
      setCurrentShop: (shop, role) => set({ currentShop: shop, currentRole: role }),
      setCurrentRegister: (register, employeeName) =>
        set({ currentRegister: register, employeeName }),
      setAuthContext: (user, currentShop, currentRole, shops, subscription = null, isSuperAdmin = false) =>
        set({ user, currentShop, currentRole, shops, subscription, isSuperAdmin, isLoading: false }),
      setShops: (shops) => set({ shops }),
      setSubscription: (subscription) => set({ subscription }),
      setLoading: (isLoading) => set({ isLoading }),
      reset: () => set({ ...initialState, isLoading: false }),
    }),
    {
      name: "novakam-auth",
      partialize: (state) => ({
        currentShop: state.currentShop,
        currentRole: state.currentRole,
        currentRegister: state.currentRegister,
        employeeName: state.employeeName,
        shops: state.shops,
        subscription: state.subscription,
        isSuperAdmin: state.isSuperAdmin,
      }),
    }
  )
);

// Selector hooks
export const useCurrentShop = () => useAuthStore((s) => s.currentShop);
export const useCurrentRole = () => useAuthStore((s) => s.currentRole);
export const useUser = () => useAuthStore((s) => s.user);
export const useCurrentPlanFromStore = () =>
  useAuthStore((s) => (s.currentShop?.plan ?? "free") as Plan);
export const useSubscription = () => useAuthStore((s) => s.subscription);
