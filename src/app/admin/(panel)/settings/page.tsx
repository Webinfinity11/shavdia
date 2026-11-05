import { SiteForm } from "@/components/admin/content-forms";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { DEFAULT_SITE, type SiteInfo } from "@/lib/site-content";

export const metadata = { title: "პარამეტრები" };
// Waits for the session check before responding.
export const instant = false;

export default async function AdminSettings() {
  await requireAdmin();
  const row = await db.setting.findUnique({ where: { key: "site" } });
  const site = { ...DEFAULT_SITE, ...(row?.value as Partial<SiteInfo> | null) };

  return (
    <>
      <div className="admin-title">
        <h1>საიტის პარამეტრები</h1>
      </div>
      <SiteForm site={site} />
    </>
  );
}
