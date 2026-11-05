import Link from "next/link";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const metadata = { title: "ახალი პროდუქტი" };
// Waits for the session check before responding.
export const instant = false;

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } });

  return (
    <>
      <Link href="/admin/products">← პროდუქტები</Link>
      <div className="admin-title" style={{ marginTop: 8 }}>
        <h1>ახალი პროდუქტი</h1>
      </div>
      <ProductForm categories={categories} />
    </>
  );
}
