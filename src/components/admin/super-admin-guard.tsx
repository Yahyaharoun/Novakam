"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth.store";
import { Loader2 } from "lucide-react";

export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isSuperAdmin, isLoading } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || isLoading) return;

    if (!user) {
      router.push("/login");
    } else if (!isSuperAdmin) {
      router.push("/"); // Redirect non-admins to their shop or onboarding
    }
  }, [mounted, isLoading, user, isSuperAdmin, router]);

  if (!mounted || isLoading || !user || !isSuperAdmin) {
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
