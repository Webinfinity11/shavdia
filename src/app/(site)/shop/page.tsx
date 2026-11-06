import type { Metadata } from "next";
import Link from "next/link";
import { caps } from "@/lib/text";
import { Suspense } from "react";
import { FilterPanel } from "@/components/filter-panel";
import { Icon } from "@/components/icon";
import { ProductCard } from "@/components/product-card";
import { SortSelect } from "@/components/sort-select";
import { getCategories, getProducts } from "@/lib/catalog";
import { getFacets, parseQuery, runQuery, toggleHref, toSearch, type ShopQuery } from "@/lib/shop-query";

export const metadata: Metadata = { title: "მაღაზია" };

const CARD_SIZES = "(max-width: 600px) 46vw, (max-width: 900px) 31vw, 360px";

function HiddenFilters({ query }: { query: ShopQuery }) {
  return (
    <>
      {query.categories.map((value) => (
        <input key={value} type="hidden" name="category" value={value} />
      ))}
      {query.sizes.map((value) => (
        <input key={value} type="hidden" name="size" value={value} />
      ))}
      {query.colors.map((value) => (
        <input key={value} type="hidden" name="color" value={value} />
      ))}
      {query.sale ? <input type="hidden" name="sale" value="1" /> : null}
      {query.sort !== "new" ? <input type="hidden" name="sort" value={query.sort} /> : null}
    </>
  );
}

async function ShopContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [params, products, categories] = await Promise.all([searchParams, getProducts(), getCategories()]);
  const query = parseQuery(params);
  const { total, pages, page, items } = runQuery(products, query);
  const facets = getFacets(products);

  const chips = [
    ...query.categories.map((slug) => ({
      label: categories.find((category) => category.slug === slug)?.name ?? slug,
      href: toggleHref(query, "categories", slug),
    })),
    ...query.sizes.map((size) => ({ label: size, href: toggleHref(query, "sizes", size) })),
    ...query.colors.map((color) => ({ label: color, href: toggleHref(query, "colors", color) })),
    ...(query.min !== null || query.max !== null
      ? [{ label: `${query.min ?? 0} – ${query.max ?? "∞"} ₾`, href: toSearch({ ...query, min: null, max: null, page: 1 }) }]
      : []),
    ...(query.sale ? [{ label: "ფასდაკლება", href: toSearch({ ...query, sale: false, page: 1 }) }] : []),
  ];

  return (
    <div className="shop-layout">
      <FilterPanel activeCount={chips.length}>
        <section className="filter-group">
          <h2>კატეგორია</h2>
          <ul className="filter-list">
            {categories.map((category) => {
              const active = query.categories.includes(category.slug);
              return (
                <li key={category.slug}>
                  <Link
                    href={toggleHref(query, "categories", category.slug)}
                    className={`filter-check${active ? " is-active" : ""}`}
                    aria-current={active ? "true" : undefined}
                    scroll={false}
                  >
                    <span className="check-box" aria-hidden="true" />
                    <span>{category.name}</span>
                    <span className="filter-count">{category.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {facets.sizes.length ? (
          <section className="filter-group">
            <h2>ზომა</h2>
            <div className="size-options">
              {facets.sizes.map((size) => (
                <Link
                  key={size}
                  href={toggleHref(query, "sizes", size)}
                  className={`size-option${query.sizes.includes(size) ? " is-selected" : ""}`}
                  scroll={false}
                >
                  {size}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {facets.colors.length ? (
          <section className="filter-group">
            <h2>ფერი</h2>
            <div className="color-options">
              {facets.colors.map((color) => (
                <Link
                  key={color.name}
                  href={toggleHref(query, "colors", color.name)}
                  className={`product-swatch${query.colors.includes(color.name) ? " is-selected" : ""}`}
                  style={{ backgroundColor: color.hex }}
                  aria-label={color.name}
                  title={color.name}
                  scroll={false}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="filter-group">
          <h2>ფასი, ₾</h2>
          <form action="/shop" className="price-form">
            <HiddenFilters query={query} />
            <label>
              <span className="sr-only">მინიმალური ფასი</span>
              <input type="number" name="min" min="0" step="any" placeholder="დან" defaultValue={query.min ?? ""} />
            </label>
            <label>
              <span className="sr-only">მაქსიმალური ფასი</span>
              <input type="number" name="max" min="0" step="any" placeholder="მდე" defaultValue={query.max ?? ""} />
            </label>
            <button type="submit" className="filter-pill">
              {caps("გამოყენება")}
            </button>
          </form>
        </section>

        {facets.hasSale ? (
          <section className="filter-group">
            <Link href={toSearch({ ...query, sale: !query.sale, page: 1 })} className={`filter-check${query.sale ? " is-active" : ""}`} scroll={false}>
              <span className="check-box" aria-hidden="true" />
              <span>მხოლოდ ფასდაკლებით</span>
            </Link>
          </section>
        ) : null}
      </FilterPanel>

      <div className="shop-results">
        <div className="shop-toolbar">
          <p className="shop-count" aria-live="polite">
            {total} პროდუქტი
          </p>
          <SortSelect query={query} />
        </div>

        {chips.length ? (
          <div className="active-filters">
            {chips.map((chip) => (
              <Link key={chip.label} href={chip.href} className="active-chip" scroll={false}>
                {chip.label} <Icon name="close" />
                <span className="sr-only">ფილტრის მოხსნა</span>
              </Link>
            ))}
            <Link href="/shop" className="clear-filters" scroll={false}>
              ყველას გასუფთავება
            </Link>
          </div>
        ) : null}

        {items.length ? (
          <div className="shop-grid" role="list" aria-label="პროდუქტები">
            {items.map((product, index) => (
              <ProductCard key={product.id} product={product} eager={index < 3} sizes={CARD_SIZES} />
            ))}
          </div>
        ) : (
          <div className="dialog-empty">
            <p>ამ ფილტრებით პროდუქტი ვერ მოიძებნა.</p>
            <Link href="/shop" className="dialog-action">
              ყველა პროდუქტი
            </Link>
          </div>
        )}

        {pages > 1 ? (
          <nav className="pagination" aria-label="გვერდები">
            {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
              <Link
                key={number}
                href={toSearch({ ...query, page: number })}
                className={`filter-pill${number === page ? " is-active" : ""}`}
                aria-current={number === page ? "page" : undefined}
              >
                {number}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

export default function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <main id="content" className="page-shell inner-page">
      <header className="page-heading">
        <h1 className="section-title">მაღაზია</h1>
      </header>
      <Suspense fallback={<p className="page-loading">იტვირთება…</p>}>
        <ShopContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
