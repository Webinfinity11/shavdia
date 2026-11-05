import { CategoryTiles } from "@/components/category-tiles";
import { Collection } from "@/components/collection";
import { Hero } from "@/components/hero";
import { getCategories, getProducts } from "@/lib/catalog";
import { getHomeContent } from "@/lib/site-content";

const HOME_PRODUCTS = 8;

export default async function Home() {
  const [content, categories, products] = await Promise.all([getHomeContent(), getCategories(), getProducts()]);
  const visible = categories.filter((category) => category.count > 0).map(({ name, slug }) => ({ name, slug }));
  const featuredFirst = [...products].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, HOME_PRODUCTS);

  return (
    <main id="content" className="page-shell">
      <Hero content={content} categories={visible} />
      <Collection title={content.collectionTitle} products={featuredFirst} tabs={visible.slice(0, 3)} />
      <CategoryTiles tiles={content.tiles} />
    </main>
  );
}
