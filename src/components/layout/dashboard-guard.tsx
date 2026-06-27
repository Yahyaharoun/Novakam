"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth.store";
import { Loader2 } from "lucide-react";
import { hydrateLocalDB } from "@/lib/sync/hydration";

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, currentShop, isSuperAdmin, isLoading } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;

    if (!user) {
      // Pas connecté -> go login
      router.push("/login");
    } else if (!currentShop) {
      if (isSuperAdmin) {
        router.push("/admin");
      } else {
        // Connecté mais pas de boutique -> go onboarding
        router.push("/onboarding");
      }
    } else {
      // Hydrate local IndexedDB for offline support
      hydrateLocalDB(currentShop.id);
    }
  }, [mounted, isLoading, user, currentShop, isSuperAdmin, router]);

  if (!mounted || isLoading || !user || !currentShop) {
    return (
      <div style={{ display: "flex", height: "100vh", width: "100vw", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
        <Loader2 size={40} style={{ animation: "spin 1s linear infinite", color: "#3b82f6" }} />
      </div>
    );
  }

  return <>{children}</>;
}
