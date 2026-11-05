// Imports categories, products and product photos from the old WooCommerce site.
// Safe to re-run: rows are matched by their WooCommerce ID and downloaded files are reused.
//   npm run import:woo

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

type WooImage = { id: number; src: string; alt: string; name: string };
type WooCategory = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  menu_order: number;
  image: WooImage | null;
};
type WooAttribute = { name: string; options: string[] };
type WooVariation = {
  id: number;
  sku: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number | null;
  stock_status: string;
  menu_order: number;
  image: WooImage | null;
  attributes: { name: string; option: string }[];
};
type WooProduct = {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string;
  status: string;
  featured: boolean;
  description: string;
  short_description: string;
  sku: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number | null;
  stock_status: string;
  categories: { id: number }[];
  images: WooImage[];
  attributes: WooAttribute[];
};

const { WP_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET, DATABASE_URL } = process.env;
if (!WP_URL || !WC_CONSUMER_KEY || !WC_CONSUMER_SECRET || !DATABASE_URL) {
  throw new Error("Set WP_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET and DATABASE_URL in .env");
}

const site = new URL(WP_URL);
const authorization = `Basic ${Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString("base64")}`;
const uploadDir = path.join(process.cwd(), "public", "uploads", "products");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

async function wooAll<T>(endpoint: string, query = ""): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`${site.origin}/wp-json/wc/v3/${endpoint}?per_page=100&page=${page}${query}`, {
      headers: { Authorization: authorization, "User-Agent": "shavdia-import" },
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`${endpoint}: HTTP ${res.status}`);
    const batch = (await res.json()) as T[];
    rows.push(...batch);
    if (batch.length < 100) return rows;
  }
}

/** Lari string from WooCommerce to tetri. Empty means no price. */
function toTetri(value: string) {
  if (!value) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new Error(`Bad price: ${value}`);
  return Math.round(amount * 100);
}

function emptyToNull(value: string) {
  return value.trim() || null;
}

/** Downloads one photo and records it in the media table. Returns its URL on the new site. */
async function importImage(image: WooImage) {
  const source = new URL(image.src);
  if (source.hostname !== site.hostname) throw new Error(`Image on another host: ${image.src}`);
  source.protocol = site.protocol;

  const fileName = path.basename(decodeURIComponent(source.pathname)).replace(/[^\w.-]/g, "-");
  const filePath = path.join(uploadDir, fileName);
  const url = `/uploads/products/${fileName}`;

  const exists = await fs.stat(filePath).then((s) => s.size > 0, () => false);
  if (!exists) {
    const res = await fetch(source, { headers: { "User-Agent": "shavdia-import" }, signal: AbortSignal.timeout(120_000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) throw new Error(`${image.src}: HTTP ${res.status} ${type}`);
    await fs.writeFile(filePath, Buffer.from(await res.arrayBuffer()));
    stats.downloaded++;
  }

  const fields = { sourceUrl: image.src, url, alt: emptyToNull(image.alt), title: emptyToNull(image.name) };
  await db.media.upsert({ where: { wpId: image.id }, create: { wpId: image.id, ...fields }, update: fields });
  return url;
}

const stats = { categories: 0, products: 0, variations: 0, images: 0, downloaded: 0 };
const skipped: string[] = [];

async function importCategories() {
  const categories = await wooAll<WooCategory>("products/categories");
  const ids = new Map<number, number>();
  for (const category of categories) {
    const fields = {
      name: category.name,
      slug: category.slug,
      description: emptyToNull(category.description),
      image: category.image ? await importImage(category.image) : null,
      sortOrder: category.menu_order,
    };
    const row = await db.category.upsert({ where: { wooId: category.id }, create: { wooId: category.id, ...fields }, update: fields });
    ids.set(category.id, row.id);
    stats.categories++;
  }
  for (const category of categories) {
    await db.category.update({
      where: { wooId: category.id },
      data: { parentId: category.parent ? (ids.get(category.parent) ?? null) : null },
    });
  }
  return ids;
}

async function importVariations(product: WooProduct, productId: number) {
  const variations = await wooAll<WooVariation>(`products/${product.id}/variations`);
  for (const variation of variations) {
    const fields = {
      productId,
      options: Object.fromEntries(variation.attributes.map((a) => [a.name, a.option])),
      sku: emptyToNull(variation.sku),
      price: toTetri(variation.regular_price),
      salePrice: toTetri(variation.sale_price),
      stockQuantity: variation.stock_quantity,
      stockStatus: variation.stock_status,
      image: variation.image ? await importImage(variation.image) : null,
      sortOrder: variation.menu_order,
    };
    await db.productVariation.upsert({ where: { wooId: variation.id }, create: { wooId: variation.id, ...fields }, update: fields });
    stats.variations++;
  }
}

async function importProducts(categoryIds: Map<number, number>) {
  const products = await wooAll<WooProduct>("products", "&status=any");
  for (const product of products) {
    // "importing" rows are empty leftovers of an unfinished WooCommerce CSV import.
    if (product.status === "importing") {
      skipped.push(`${product.id} ${product.name}`);
      continue;
    }

    const images = [];
    for (const image of product.images) {
      images.push({ url: await importImage(image), alt: emptyToNull(image.alt), sortOrder: images.length });
      stats.images++;
    }

    const categories = product.categories.flatMap((c) => {
      const id = categoryIds.get(c.id);
      return id ? [{ id }] : [];
    });
    const fields = {
      name: product.name,
      slug: decodeURIComponent(product.slug),
      shortDescription: emptyToNull(product.short_description),
      description: emptyToNull(product.description),
      sku: emptyToNull(product.sku),
      type: product.type === "variable" ? "variable" : "simple",
      price: toTetri(product.regular_price),
      salePrice: toTetri(product.sale_price),
      stockQuantity: product.stock_quantity,
      stockStatus: product.stock_status,
      status: product.status === "publish" ? "published" : "draft",
      featured: product.featured,
      attributes: product.attributes.map((a) => ({ name: a.name, values: a.options })),
      oldPath: decodeURIComponent(new URL(product.permalink).pathname),
    };

    const row = await db.product.upsert({
      where: { wooId: product.id },
      create: { wooId: product.id, ...fields, categories: { connect: categories }, images: { create: images } },
      update: { ...fields, categories: { set: categories }, images: { deleteMany: {}, create: images } },
    });
    if (product.type === "variable") await importVariations(product, row.id);
    stats.products++;
  }
}

async function main() {
  await fs.mkdir(uploadDir, { recursive: true });
  const categoryIds = await importCategories();
  await importProducts(categoryIds);
  console.log("Imported:", stats);
  console.log(`Skipped ${skipped.length} empty placeholders`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
