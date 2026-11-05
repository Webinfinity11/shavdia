// Shop page filters. Everything lives in the URL, so a filtered page can be shared or bookmarked.

import { currentPrice, isOnSale, type ProductSummary } from "./product";

export const PER_PAGE = 12;

export const SORTS = [
  { value: "new", label: "ჯერ ახლები" },
  { value: "price-asc", label: "ფასი: ზრდადობით" },
  { value: "price-desc", label: "ფასი: კლებადობით" },
  { value: "name", label: "სახელით" },
] as const;

export type ShopQuery = {
  categories: string[];
  sizes: string[];
  colors: string[];
  /** In lari, as typed by the visitor */
  min: number | null;
  max: number | null;
  sale: boolean;
  sort: (typeof SORTS)[number]["value"];
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function list(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);
}

function amount(value: string | string[] | undefined) {
  const text = list(value)[0];
  if (!text) return null;
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function parseQuery(params: RawParams): ShopQuery {
  const sort = SORTS.find((option) => option.value === list(params.sort)[0])?.value ?? "new";
  const page = Number(list(params.page)[0]);
  return {
    categories: list(params.category),
    sizes: list(params.size),
    colors: list(params.color),
    min: amount(params.min),
    max: amount(params.max),
    sale: list(params.sale)[0] === "1",
    sort,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function toSearch(query: ShopQuery) {
  const search = new URLSearchParams();
  query.categories.forEach((value) => search.append("category", value));
  query.sizes.forEach((value) => search.append("size", value));
  query.colors.forEach((value) => search.append("color", value));
  if (query.min !== null) search.set("min", String(query.min));
  if (query.max !== null) search.set("max", String(query.max));
  if (query.sale) search.set("sale", "1");
  if (query.sort !== "new") search.set("sort", query.sort);
  if (query.page > 1) search.set("page", String(query.page));
  const text = search.toString();
  return text ? `/shop?${text}` : "/shop";
}

/** Link with one filter value switched on or off. Changing a filter returns to page 1. */
export function toggleHref(query: ShopQuery, key: "categories" | "sizes" | "colors", value: string) {
  const current = query[key];
  const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
  return toSearch({ ...query, [key]: next, page: 1 });
}

function matches(product: ProductSummary, query: ShopQuery) {
  const price = currentPrice(product) / 100;
  if (query.categories.length && !product.categories.some((c) => query.categories.includes(c.slug))) return false;
  if (query.sizes.length && !product.sizes.some((size) => query.sizes.includes(size))) return false;
  if (query.colors.length && !product.colors.some((color) => query.colors.includes(color.name))) return false;
  if (query.min !== null && price < query.min) return false;
  if (query.max !== null && price > query.max) return false;
  if (query.sale && !isOnSale(product)) return false;
  return true;
}

function sorted(products: ProductSummary[], sort: ShopQuery["sort"]) {
  const rows = [...products];
  if (sort === "price-asc") rows.sort((a, b) => currentPrice(a) - currentPrice(b));
  if (sort === "price-desc") rows.sort((a, b) => currentPrice(b) - currentPrice(a));
  if (sort === "name") rows.sort((a, b) => a.name.localeCompare(b.name, "ka", { numeric: true }));
  return rows;
}

export function runQuery(products: ProductSummary[], query: ShopQuery) {
  const rows = sorted(products.filter((product) => matches(product, query)), query.sort);
  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const page = Math.min(query.page, pages);
  return { total: rows.length, pages, page, items: rows.slice((page - 1) * PER_PAGE, page * PER_PAGE) };
}

/** Sizes and colours that exist in the catalog, in first-seen order. */
export function getFacets(products: ProductSummary[]) {
  const sizes = new Set<string>();
  const colors = new Map<string, string>();
  let hasSale = false;
  for (const product of products) {
    product.sizes.forEach((size) => sizes.add(size));
    product.colors.forEach((color) => colors.set(color.name, color.hex));
    if (isOnSale(product)) hasSale = true;
  }
  return { sizes: [...sizes], colors: [...colors].map(([name, hex]) => ({ name, hex })), hasSale };
}
