// Product types and helpers shared by the server and the browser.

export type ColorOption = { name: string; hex: string };
export type CategoryRef = { name: string; slug: string };

export type ProductSummary = {
  id: number;
  name: string;
  slug: string;
  /** Prices are in tetri (1 GEL = 100) */
  price: number;
  salePrice: number | null;
  image: string | null;
  imageAlt: string;
  categories: CategoryRef[];
  sizes: string[];
  colors: ColorOption[];
  inStock: boolean;
  featured: boolean;
  createdAt: string;
};

export type ProductDetail = ProductSummary & {
  images: { url: string; alt: string }[];
  shortDescription: string | null;
  description: string | null;
  sku: string | null;
};

export type CategoryView = CategoryRef & {
  id: number;
  description: string | null;
  image: string | null;
  count: number;
};

export function money(tetri: number) {
  return `${(tetri / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })} ₾`;
}

export function isOnSale(product: Pick<ProductSummary, "price" | "salePrice">) {
  return product.salePrice !== null && product.salePrice < product.price;
}

export function currentPrice(product: Pick<ProductSummary, "price" | "salePrice">) {
  return isOnSale(product) ? (product.salePrice as number) : product.price;
}

/** More than one size or colour means the visitor has to choose on the product page. */
export function needsChoice(product: Pick<ProductSummary, "sizes" | "colors">) {
  return product.sizes.length > 1 || product.colors.length > 1;
}

const SIZE_NAME = /^(pa_)?(size|ზომა)$/i;
const COLOR_NAME = /^(pa_)?(colou?r|ფერი)$/i;
const FALLBACK_HEX = "#b9b9b9";

export type AttributeRow = { name: string; values: string[]; colors?: Record<string, string> };

export function parseAttributes(value: unknown): AttributeRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) =>
    row && typeof row.name === "string" && Array.isArray(row.values)
      ? [{ name: row.name, values: row.values.map(String), colors: row.colors ?? undefined }]
      : [],
  );
}

export function isOptionAttribute(name: string) {
  return SIZE_NAME.test(name) || COLOR_NAME.test(name);
}

export function readOptions(attributes: unknown) {
  const rows = parseAttributes(attributes);
  const color = rows.find((row) => COLOR_NAME.test(row.name));
  return {
    sizes: rows.find((row) => SIZE_NAME.test(row.name))?.values ?? [],
    colors: (color?.values ?? []).map((name) => ({ name, hex: color?.colors?.[name] ?? FALLBACK_HEX })),
  };
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", "#039": "'", apos: "'", nbsp: " " };

/** Descriptions may hold HTML from the old site. They are shown as plain paragraphs, never as raw HTML. */
export function descriptionParagraphs(text: string | null) {
  if (!text) return [];
  return text
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#?\w+);/g, (whole, code: string) => ENTITIES[code] ?? whole)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}
