import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { ProductPurchase } from "@/components/product-purchase";
import { getProduct, getProducts } from "@/lib/catalog";
import { descriptionParagraphs } from "@/lib/product";

type Props = { params: Promise<{ slug: string }> };

const RELATED = 4;

// Waits for the product before responding, so an unknown link gets a real 404 status.
export const instant = false;

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct(decodeURIComponent((await params).slug));
  if (!product) return { title: "პროდუქტი ვერ მოიძებნა" };
  const description = descriptionParagraphs(product.shortDescription ?? product.description)[0];
  return { title: product.name, description, openGraph: { images: product.image ? [product.image] : [] } };
}

export default async function ProductPage({ params }: Props) {
  const slug = decodeURIComponent((await params).slug);
  const [product, products] = await Promise.all([getProduct(slug), getProducts()]);
  if (!product) notFound();

  const category = product.categories[0];
  const slugs = product.categories.map((item) => item.slug);
  const related = products
    .filter((other) => other.id !== product.id && other.categories.some((item) => slugs.includes(item.slug)))
    .slice(0, RELATED);

  return (
    <main id="content" className="page-shell inner-page">
      <nav className="breadcrumbs" aria-label="ნავიგაცია">
        <Link href="/">მთავარი</Link>
        <span aria-hidden="true">/</span>
        <Link href="/shop">მაღაზია</Link>
        {category ? (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/shop?category=${category.slug}`}>{category.name}</Link>
          </>
        ) : null}
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <ProductPurchase key={product.id} product={product} tryOnEnabled={Boolean(process.env.GEMINI_API_KEY)} />

      {related.length ? (
        <section className="related-section" aria-labelledby="related-title">
          <h2 className="section-title" id="related-title">
            მსგავსი პროდუქტები
          </h2>
          <div className="shop-grid related-grid" role="list">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} sizes="(max-width: 600px) 46vw, (max-width: 900px) 31vw, 360px" />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
