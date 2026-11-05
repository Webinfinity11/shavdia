import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const metadata = { title: "მთავარი" };
// Waits for the session check before responding.
export const instant = false;

export default async function AdminDashboard() {
  await requireAdmin();
  const [newOrders, published, drafts, categories, withoutPhoto] = await Promise.all([
    db.order.count({ where: { status: "new" } }),
    db.product.count({ where: { status: "published" } }),
    db.product.count({ where: { status: "draft" } }),
    db.category.count(),
    db.product.count({ where: { images: { none: {} } } }),
  ]);

  return (
    <>
      <div className="admin-title">
        <h1>მთავარი</h1>
        <Link href="/admin/products/new" className="admin-btn">
          ახალი პროდუქტი
        </Link>
      </div>
      <div className="admin-stats">
        <Link className="admin-stat" href="/admin/orders?status=new">
          <strong>{newOrders}</strong>
          <span>ახალი შეკვეთა</span>
        </Link>
        <Link className="admin-stat" href="/admin/products">
          <strong>{published}</strong>
          <span>გამოქვეყნებული პროდუქტი</span>
        </Link>
        <Link className="admin-stat" href="/admin/products?status=draft">
          <strong>{drafts}</strong>
          <span>დრაფტი</span>
        </Link>
        <Link className="admin-stat" href="/admin/categories">
          <strong>{categories}</strong>
          <span>კატეგორია</span>
        </Link>
        <Link className="admin-stat" href="/admin/products">
          <strong>{withoutPhoto}</strong>
          <span>პროდუქტი ფოტოს გარეშე</span>
        </Link>
      </div>
      <div className="admin-card">
        <h2>სწრაფი ბმულები</h2>
        <div className="admin-checks">
          <Link href="/admin/home" className="admin-btn admin-btn-ghost">მთავარი გვერდის ბანერები</Link>
          <Link href="/admin/settings" className="admin-btn admin-btn-ghost">საიტის პარამეტრები</Link>
          <a href="/" target="_blank" rel="noreferrer" className="admin-btn admin-btn-ghost">საიტის ნახვა</a>
        </div>
      </div>
    </>
  );
}
