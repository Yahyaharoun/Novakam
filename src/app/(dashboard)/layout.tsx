// src/app/(dashboard)/layout.tsx
// Auth is handled client-side via Zustand store (offline-first mode)
// Server-side Supabase check is bypassed for local compatibility
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DashboardGuard } from "@/components/layout/dashboard-guard";
import { NetworkStatus } from "@/components/ui/network-status";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardGuard>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <div
          style={{
            flex: 1,
            marginLeft: "var(--sidebar-width)",
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
            background: "var(--bg-base)",
          }}
        >
          <Header />
          <main
            style={{
              flex: 1,
              padding: "24px",
              maxWidth: "1400px",
              width: "100%",
            }}
          >
            {children}
          </main>
        </div>
      </div>
      <NetworkStatus />
    </DashboardGuard>
  );
}
