import { AboutForm } from "@/components/admin/content-forms";
import { requireAdmin } from "@/lib/admin";
import { DEFAULT_ABOUT, readSetting } from "@/lib/site-content";

export const metadata = { title: "ჩვენ შესახებ" };
// Waits for the session check before responding.
export const instant = false;

export default async function AdminAbout() {
  await requireAdmin();
  const about = { ...DEFAULT_ABOUT, ...(await readSetting("about")) };

  return (
    <>
      <div className="admin-title">
        <h1>ჩვენ შესახებ</h1>
      </div>
      <AboutForm about={about} />
    </>
  );
}
