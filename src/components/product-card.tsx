"use client";

import Image from "next/image";
import Link from "next/link";
import { caps } from "@/lib/text";
import { currentPrice, isOnSale, money, needsChoice, type ProductSummary } from "@/lib/product";
import { addToCart, MAX_QUANTITY, toggleWishlist, useShopStore } from "@/lib/shop-store";
import { Icon } from "./icon";
import { useShop } from "./shop-provider";

export function ProductPrice({ product }: { product: ProductSummary }) {
  return (
    <p className="product-price">
      {money(currentPrice(product))}
      {isOnSale(product) ? <s className="old-price">{money(product.price)}</s> : null}
    </p>
  );
}

type Props = { product: ProductSummary; eager?: boolean; sizes: string };

export function ProductCard({ product, eager = false, sizes }: Props) {
  const { openDialog, showToast } = useShop();
  const { wishlist } = useShopStore();
  const saved = wishlist.some((item) => item.id === product.id);
  const href = `/product/${product.slug}`;

  return (
    <article className="product-card" role="listitem">
      <div className="product-image-wrap">
        <Link className="product-image-button" href={href} aria-label={product.name}>
          {product.image ? (
            <Image
              className="product-image"
              src={product.image}
              alt={product.imageAlt}
              width={1000}
              height={1333}
              sizes={sizes}
              loading={eager ? "eager" : "lazy"}
            />
          ) : null}
        </Link>
        {isOnSale(product) ? <span className="sale-badge">ფასდაკლება</span> : null}
        <button
          className={`wishlist-button${saved ? " is-wished" : ""}`}
          type="button"
          aria-pressed={saved}
          aria-label={saved ? `${product.name}: რჩეულებიდან წაშლა` : `${product.name}: რჩეულებში დამატება`}
          onClick={() => showToast(toggleWishlist(product) ? "დაემატა რჩეულებში." : "წაიშალა რჩეულებიდან.")}
        >
          <Icon name="heart" />
        </button>
      </div>
      <div className="product-info">
        <div className="product-swatches" aria-label={product.colors.length ? "ფერები" : undefined}>
          {product.colors.map((color) => (
            <span key={color.name} className="product-swatch is-static" style={{ backgroundColor: color.hex }} title={color.name} />
          ))}
        </div>
        <h3 className="product-name">
          <Link href={href} className="product-open">
            {product.name}
          </Link>
        </h3>
        <ProductPrice product={product} />
        {product.inStock && needsChoice(product) ? (
          <Link className="quick-add" href={href} aria-label={`${product.name}: ზომის და ფერის არჩევა`}>
            <span>{caps("არჩევა")}</span>
            <Icon name="right" />
          </Link>
        ) : (
          <button
            className="quick-add"
            type="button"
            disabled={!product.inStock}
            aria-label={`${product.name}: კალათაში დამატება`}
            onClick={() => {
              if (addToCart(product, product.sizes[0] ?? "", product.colors[0]?.name ?? "")) openDialog("cart");
              else showToast(`ერთი პროდუქტის მაქსიმალური რაოდენობაა ${MAX_QUANTITY}.`);
            }}
          >
            {product.inStock ? (
              <>
                <span>{caps("კალათაში")}</span>
                <Icon name="plus" />
              </>
            ) : (
              <span>{caps("მარაგში არ არის")}</span>
            )}
          </button>
        )}
      </div>
    </article>
  );
}
