import Image from "next/image";
import Link from "next/link";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { money } from "@/lib/product";
import { deleteProduct } from "../../actions";

export const metadata = { title: "პროდუქტები" };
// Waits for the session check before responding.
export const instant = false;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminProducts({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const status = params.status === "draft" || params.status === "published" ? params.status : undefined;

  const products = await db.product.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { sku: { contains: search, mode: "insensitive" as const } }] } : {}),
    },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, categories: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return (
    <>
      <div className="admin-title">
        <h1>პროდუქტები ({products.length})</h1>
        <Link href="/admin/products/new" className="admin-btn">
          ახალი პროდუქტი
        </Link>
      </div>
      {params.deleted ? <p className="admin-note admin-note-ok">პროდუქტი წაიშალა.</p> : null}

      <form className="admin-card admin-checks" action="/admin/products">
        <input className="admin-input" style={{ flex: "1 1 220px", width: "auto" }} type="search" name="q" placeholder="ძიება სახელით ან არტიკულით" defaultValue={search} />
        <select className="admin-input" style={{ width: "auto" }} name="status" defaultValue={status ?? ""} aria-label="სტატუსი">
          <option value="">ყველა სტატუსი</option>
          <option value="published">გამოქვეყნებული</option>
          <option value="draft">დრაფტი</option>
        </select>
        <button className="admin-btn admin-btn-ghost" type="submit">
          ძიება
        </button>
      </form>

      <div className="admin-card admin-table-wrap">
        {products.length ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>ფოტო</th>
                <th>სახელი</th>
                <th>ფასი</th>
                <th>კატეგორიები</th>
                <th>სტატუსი</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    {product.images[0] ? (
                      <Image className="admin-thumb" src={product.images[0].url} alt="" width={1000} height={1333} sizes="48px" />
                    ) : (
                      <span className="admin-tag admin-tag-draft">ფოტო არ არის</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/admin/products/${product.id}`}>{product.name}</Link>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {product.salePrice !== null ? `${money(product.salePrice)} (${money(product.price ?? 0)})` : money(product.price ?? 0)}
                  </td>
                  <td>{product.categories.length > 2 ? `${product.categories.length} კატეგორია` : product.categories.map((c) => c.name).join(", ") || "არ არის"}</td>
                  <td>
                    <span className={`admin-tag${product.status === "draft" ? " admin-tag-draft" : ""}`}>
                      {product.status === "draft" ? "დრაფტი" : "გამოქვეყნებული"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <Link className="admin-btn admin-btn-ghost admin-btn-small" href={`/admin/products/${product.id}`}>
                        შეცვლა
                      </Link>
                      <form action={deleteProduct}>
                        <input type="hidden" name="id" value={product.id} />
                        <ConfirmButton message={`წავშალო „${product.name}“?`}>წაშლა</ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>პროდუქტი ვერ მოიძებნა.</p>
        )}
      </div>
    </>
  );
}
