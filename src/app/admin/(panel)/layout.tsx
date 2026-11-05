import { Suspense } from "react";
import { AdminNav, AdminNavLinks } from "@/components/admin/admin-nav";
import { logout } from "../actions";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">SHAVDIA</div>
        <Suspense fallback={<AdminNavLinks />}>
          <AdminNav />
        </Suspense>
        <form action={logout}>
          <button type="submit">გასვლა</button>
        </form>
      </aside>
      <main className="admin-main">
        <Suspense fallback={<p className="page-loading">იტვირთება…</p>}>{children}</Suspense>
      </main>
    </div>
  );
}
