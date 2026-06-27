"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { loadUserContext } from "@/lib/auth/session";
import { useAuthStore } from "@/lib/store/auth.store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function hydrate() {
      // Check local bypass
      const isLocal = document.cookie.includes("novakam-local-session=true");
      if (isLocal) {
        // Restore a mock user to satisfy DashboardGuard
        let currentShop = useAuthStore.getState().currentShop;
        if (!currentShop) {
          currentShop = {
            id: "mock-shop-fallback",
            name: "Ma Boutique",
            slug: "ma-boutique",
            currency: "FCFA",
            language: "fr",
            logo_url: null,
            plan: "free" as const
          };
          useAuthStore.getState().setCurrentShop(currentShop!, "owner");
        }
        useAuthStore.getState().setUser({
          id: "local-user-bypass",
          email: "demo@novakam.app",
          app_metadata: {},
          user_metadata: { full_name: "Demo User" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as any);
        useAuthStore.getState().setLoading(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (user) {
          await loadUserContext(supabase, user);
        } else {
          useAuthStore.getState().reset();
        }
      } catch (err) {
        console.warn("Offline or auth error:", err);
        if (mounted) useAuthStore.getState().reset();
      }
    }

    hydrate();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const isLocal = document.cookie.includes("novakam-local-session=true");
      if (isLocal) return;

      if (event === "SIGNED_OUT" || !session?.user) {
        useAuthStore.getState().reset();
        return;
      }

      void loadUserContext(supabase, session.user);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return children;
}
