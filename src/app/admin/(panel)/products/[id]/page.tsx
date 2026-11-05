import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { readOptions } from "@/lib/product";

export const metadata = { title: "პროდუქტის შეცვლა" };
// Waits for the session check before responding.
export const instant = false;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function lari(tetri: number | null) {
  return tetri === null ? "" : String(tetri / 100);
}

export default async function EditProductPage({ params, searchParams }: Props) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const saved = (await searchParams).saved === "1";

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: "asc" } }, categories: { select: { id: true } } },
    }),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);
  if (!product) notFound();
  const { sizes, colors } = readOptions(product.attributes);

  return (
    <>
      <Link href="/admin/products">← პროდუქტები</Link>
      <div className="admin-title" style={{ marginTop: 8 }}>
        <h1>{product.name}</h1>
        {product.status === "published" ? (
          <a className="admin-btn admin-btn-ghost" href={`/product/${product.slug}`} target="_blank" rel="noreferrer">
            საიტზე ნახვა
          </a>
        ) : null}
      </div>
      {saved ? <p className="admin-note admin-note-ok">შენახულია.</p> : null}
      <ProductForm
        key={product.updatedAt.toISOString()}
        categories={categories}
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          sku: product.sku ?? "",
          shortDescription: product.shortDescription ?? "",
          description: product.description ?? "",
          price: lari(product.price),
          salePrice: lari(product.salePrice),
          stockQuantity: product.stockQuantity === null ? "" : String(product.stockQuantity),
          stockStatus: product.stockStatus === "outofstock" ? "outofstock" : "instock",
          status: product.status === "draft" ? "draft" : "published",
          featured: product.featured,
          categoryIds: product.categories.map((category) => category.id),
          images: product.images.map((image) => image.url),
          sizes,
          colors,
        }}
      />
    </>
  );
}
