import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { readOptions, type CategoryView, type ProductDetail, type ProductSummary } from "@/lib/product";

export const CATALOG_TAG = "catalog";

const include = {
  images: { orderBy: { sortOrder: "asc" as const } },
  categories: { orderBy: [{ sortOrder: "asc" as const }, { name: "asc" as const }], select: { name: true, slug: true } },
  variations: { select: { price: true, salePrice: true, stockStatus: true } },
};

type Row = NonNullable<Awaited<ReturnType<typeof findOne>>>;

function findOne(slug: string) {
  return db.product.findFirst({ where: { slug, status: "published" }, include });
}

function toSummary(row: Row): ProductSummary {
  const variationPrices = row.variations.flatMap((v) => (v.price === null ? [] : [v.price]));
  const inStock = row.variations.length
    ? row.variations.some((v) => v.stockStatus !== "outofstock")
    : row.stockStatus !== "outofstock";
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: row.price ?? (variationPrices.length ? Math.min(...variationPrices) : 0),
    salePrice: row.salePrice,
    image: row.images[0]?.url ?? null,
    imageAlt: row.images[0]?.alt ?? row.name,
    categories: row.categories,
    ...readOptions(row.attributes),
    inStock,
    featured: row.featured,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getProducts(): Promise<ProductSummary[]> {
  "use cache";
  cacheLife("max");
  cacheTag(CATALOG_TAG);
  const rows = await db.product.findMany({
    where: { status: "published" },
    include,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return rows.map(toSummary);
}

export async function getProduct(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("max");
  cacheTag(CATALOG_TAG);
  const row = await findOne(slug);
  if (!row) return null;
  return {
    ...toSummary(row),
    images: row.images.map((image) => ({ url: image.url, alt: image.alt ?? row.name })),
    shortDescription: row.shortDescription,
    description: row.description,
    sku: row.sku,
  };
}

export async function getCategories(): Promise<CategoryView[]> {
  "use cache";
  cacheLife("max");
  cacheTag(CATALOG_TAG);
  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { status: "published" } } } } },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image: row.image,
    count: row._count.products,
  }));
}
