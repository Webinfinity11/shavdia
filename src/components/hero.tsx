import Image from "next/image";
import Link from "next/link";
import { caps } from "@/lib/text";
import type { CategoryRef } from "@/lib/product";
import { DESIGN_DETAIL_IMAGE, DESIGN_HERO_IMAGE, type HomeContent } from "@/lib/site-content";
import { Icon } from "./icon";

export function Hero({ content, categories }: { content: HomeContent; categories: CategoryRef[] }) {
  return (
    <section className="hero-grid" aria-label={content.editorialTitle}>
      <aside className="category-menu">
        <h1>{caps("მაღაზია")}</h1>
        <nav className="category-nav" aria-label="კატეგორიები">
          <Link href="/shop">{caps("სიახლეები")}</Link>
          {categories.slice(0, 3).map((category) => (
            <Link key={category.slug} href={`/shop?category=${category.slug}`}>
              {caps(category.name)}
            </Link>
          ))}
        </nav>
        <Link href="/shop" className="button shop-all">
          {caps("ყველას ნახვა")} <Icon name="right" />
        </Link>
      </aside>

      <figure className={`hero-photo${content.heroImage === DESIGN_HERO_IMAGE ? " design-crop" : ""}`}>
        <Image
          src={content.heroImage}
          alt={content.heroAlt}
          width={1086}
          height={1448}
          sizes="(max-width: 900px) 60vw, 700px"
          loading="eager"
          fetchPriority="high"
        />
        {content.heroCaption ? (
          <figcaption className="hero-caption">
            <span>{caps(content.heroCaption)}</span>
          </figcaption>
        ) : null}
      </figure>

      <div className="hero-features">
        <figure className={`detail-photo${content.detailImage === DESIGN_DETAIL_IMAGE ? " design-crop" : ""}`}>
          <Image src={content.detailImage} alt={content.detailAlt} width={1086} height={1448} sizes="(max-width: 600px) 440px, 1086px" loading="eager" />
        </figure>
        <div className="editorial-card">
          <p>{content.editorialTitle}</p>
          <Link href={content.editorialLink} className="button button-light">
            {caps(content.editorialButton)} <Icon name="right" />
          </Link>
        </div>
      </div>
    </section>
  );
}
