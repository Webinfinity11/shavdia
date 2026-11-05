import Image from "next/image";
import Link from "next/link";
import { CategoryForm } from "@/components/admin/category-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { deleteCategory } from "../../actions";

export const metadata = { title: "კატეგორიები" };
// Waits for the session check before responding.
export const instant = false;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminCategories({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const categories = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  const editing = categories.find((category) => String(category.id) === params.edit);

  return (
    <>
      <div className="admin-title">
        <h1>კატეგორიები ({categories.length})</h1>
      </div>
      {params.saved ? <p className="admin-note admin-note-ok">შენახულია.</p> : null}
      {params.deleted ? <p className="admin-note admin-note-ok">კატეგორია წაიშალა. პროდუქტები დარჩა.</p> : null}

      <CategoryForm
        key={editing?.id ?? "new"}
        initial={
          editing
            ? {
                id: editing.id,
                name: editing.name,
                slug: editing.slug,
                description: editing.description ?? "",
                image: editing.image ?? "",
                sortOrder: editing.sortOrder,
              }
            : undefined
        }
      />

      <div className="admin-card admin-table-wrap">
        <p className="admin-field"><small>ნაკლები რიგითი ნომრის მქონე კატეგორია ჩანს პირველი. მთავარ გვერდზე პირველი სამი ჩანს.</small></p>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ფოტო</th>
              <th>სახელი</th>
              <th>ბმული</th>
              <th>რიგი</th>
              <th>პროდუქტი</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>
                  {category.image ? <Image className="admin-thumb" src={category.image} alt="" width={1000} height={1333} sizes="48px" /> : null}
                </td>
                <td>{category.name}</td>
                <td>{category.slug}</td>
                <td>{category.sortOrder}</td>
                <td>{category._count.products}</td>
                <td>
                  <div className="admin-row-actions">
                    <Link className="admin-btn admin-btn-ghost admin-btn-small" href={`/admin/categories?edit=${category.id}`}>
                      შეცვლა
                    </Link>
                    <form action={deleteCategory}>
                      <input type="hidden" name="id" value={category.id} />
                      <ConfirmButton message={`წავშალო კატეგორია „${category.name}“? პროდუქტები არ წაიშლება.`}>წაშლა</ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
