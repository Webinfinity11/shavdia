import Image from "next/image";
import Link from "next/link";
import type { CategoryRef } from "@/lib/product";
import type { HomeContent } from "@/lib/site-content";
import { Icon } from "./icon";

export function Hero({ content, categories }: { content: HomeContent; categories: CategoryRef[] }) {
  return (
    <section className="hero-grid" aria-label={content.editorialTitle}>
      <aside className="category-menu">
        <h1>მაღაზია</h1>
        <nav className="category-nav" aria-label="კატეგორიები">
          <Link href="/shop">სიახლეები</Link>
          {categories.slice(0, 3).map((category) => (
            <Link key={category.slug} href={`/shop?category=${category.slug}`}>
              {category.name}
            </Link>
          ))}
        </nav>
        <Link href="/shop" className="button shop-all">
          ყველას ნახვა <Icon name="right" />
        </Link>
      </aside>

      <figure className="hero-photo">
        <Image
          src={content.heroImage}
          alt={content.heroAlt}
          width={1000}
          height={1000}
          sizes="(max-width: 900px) 60vw, 700px"
          loading="eager"
          fetchPriority="high"
        />
        {content.heroCaption ? (
          <figcaption className="hero-caption">
            <span>{content.heroCaption}</span>
          </figcaption>
        ) : null}
      </figure>

      <div className="hero-features">
        <figure className="detail-photo">
          <Image src={content.detailImage} alt={content.detailAlt} width={1000} height={1200} sizes="(max-width: 900px) 40vw, 520px" loading="eager" />
        </figure>
        <div className="editorial-card">
          <p>{content.editorialTitle}</p>
          <Link href={content.editorialLink} className="button button-light">
            {content.editorialButton} <Icon name="right" />
          </Link>
        </div>
      </div>
    </section>
  );
}
