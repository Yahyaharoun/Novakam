import { SuperAdminGuard } from "@/components/admin/super-admin-guard";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SuperAdminGuard>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <AdminSidebar />
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
          <AdminHeader />
          <main
            style={{
              flex: 1,
              padding: "24px",
              maxWidth: "1400px",
              width: "100%",
              margin: "0 auto",
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </SuperAdminGuard>
  );
}
