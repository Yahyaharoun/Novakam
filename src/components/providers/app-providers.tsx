"use client";
// Provider qui initialise PWA + Sync au démarrage
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { useBootstrap } from "@/lib/hooks/use-bootstrap";
import { AuthProvider } from "./auth-provider";
import { ThemeProvider } from "./theme-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  useBootstrap();

  // Register Service Worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("[SW] Registered:", reg.scope))
        .catch((err) => console.error("[SW] Error:", err));

      // Listen for background sync messages
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data?.type === "BACKGROUND_SYNC") {
          import("@/lib/sync/engine").then(({ runSync }) => runSync());
        }
      });
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <AuthProvider>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
              borderRadius: "10px",
              fontSize: "13px",
              boxShadow: "var(--shadow-lg)",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "white" },
              duration: 3000,
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "white" },
              duration: 5000,
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
