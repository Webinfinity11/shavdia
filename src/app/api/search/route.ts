import { getProducts } from "@/lib/catalog";

const LIMIT = 20;

export async function GET(request: Request) {
  const words = (new URL(request.url).searchParams.get("q") ?? "").toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return Response.json([]);

  const products = await getProducts();
  const results = products.filter((product) => {
    const text = [product.name, ...product.categories.map((c) => c.name), ...product.colors.map((c) => c.name)].join(" ").toLowerCase();
    return words.every((word) => text.includes(word));
  });
  return Response.json(results.slice(0, LIMIT));
}
