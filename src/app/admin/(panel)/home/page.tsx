import { HomeForm } from "@/components/admin/content-forms";
import { requireAdmin } from "@/lib/admin";
import { DEFAULT_HOME, type HomeContent } from "@/lib/site-content";
import { db } from "@/lib/db";

export const metadata = { title: "მთავარი გვერდი" };
// Waits for the session check before responding.
export const instant = false;

export default async function AdminHome() {
  await requireAdmin();
  const row = await db.setting.findUnique({ where: { key: "home" } });
  const content = { ...DEFAULT_HOME, ...(row?.value as Partial<HomeContent> | null) };

  return (
    <>
      <div className="admin-title">
        <h1>მთავარი გვერდი</h1>
      </div>
      <HomeForm content={content} />
    </>
  );
}
