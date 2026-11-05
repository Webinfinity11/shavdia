"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { descriptionParagraphs, isOnSale, type ProductDetail } from "@/lib/product";
import { addToCart, MAX_QUANTITY, toggleWishlist, useShopStore } from "@/lib/shop-store";
import { Icon } from "./icon";
import { ColorPicker, SizePicker } from "./option-picker";
import { ProductPrice } from "./product-card";
import { useShop } from "./shop-provider";

function Gallery({ product }: { product: ProductDetail }) {
  const [active, setActive] = useState(0);
  const image = product.images[active];

  return (
    <div className="product-gallery">
      {product.images.length > 1 ? (
        <div className="gallery-thumbs" role="group" aria-label="ფოტოები">
          {product.images.map((thumb, index) => (
            <button
              key={thumb.url}
              type="button"
              className={`gallery-thumb${index === active ? " is-active" : ""}`}
              aria-label={`ფოტო ${index + 1}`}
              aria-pressed={index === active}
              onClick={() => setActive(index)}
            >
              <Image src={thumb.url} alt="" width={1000} height={1333} sizes="96px" />
            </button>
          ))}
        </div>
      ) : null}
      <div className="gallery-main">
        {image ? (
          <Image
            key={image.url}
            src={image.url}
            alt={image.alt}
            width={1000}
            height={1333}
            sizes="(max-width: 900px) 100vw, 760px"
            loading="eager"
            fetchPriority="high"
          />
        ) : null}
        {isOnSale(product) ? <span className="sale-badge">ფასდაკლება</span> : null}
      </div>
    </div>
  );
}

export function ProductPurchase({ product }: { product: ProductDetail }) {
  const { openDialog, showToast } = useShop();
  const { wishlist } = useShopStore();
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [color, setColor] = useState(product.colors[0]?.name ?? "");
  const saved = wishlist.some((item) => item.id === product.id);
  const paragraphs = descriptionParagraphs(product.description);
  const intro = descriptionParagraphs(product.shortDescription);

  return (
    <div className="product-layout">
      <Gallery product={product} />
      <div className="product-details">
        {product.categories[0] ? <p className="eyebrow">{product.categories[0].name}</p> : null}
        <h1 className="product-title">{product.name}</h1>
        <ProductPrice product={product} />
        {intro.map((line, index) => (
          <p key={index} className="product-intro">
            {line}
          </p>
        ))}
        {product.colors.length ? <ColorPicker colors={product.colors} value={color} onChange={setColor} /> : null}
        {product.sizes.length ? <SizePicker sizes={product.sizes} value={size} onChange={setSize} /> : null}
        <div className="purchase-actions">
          <button
            className="button"
            type="button"
            disabled={!product.inStock}
            onClick={() => {
              if (addToCart(product, size, color)) openDialog("cart");
              else showToast(`ერთი პროდუქტის მაქსიმალური რაოდენობაა ${MAX_QUANTITY}.`);
            }}
          >
            {product.inStock ? "კალათაში დამატება +" : "მარაგში არ არის"}
          </button>
          <button
            className={`wishlist-toggle${saved ? " is-wished" : ""}`}
            type="button"
            aria-pressed={saved}
            aria-label={saved ? "რჩეულებიდან წაშლა" : "რჩეულებში დამატება"}
            onClick={() => showToast(toggleWishlist(product) ? "დაემატა რჩეულებში." : "წაიშალა რჩეულებიდან.")}
          >
            <Icon name="heart" />
          </button>
        </div>

        <ul className="product-assurances">
          <li>დამზადებულია საქართველოში</li>
          <li>დროული მიტანა</li>
          <li>
            <Link href="/contact">ჩვენი მაღაზიები</Link>
          </li>
        </ul>

        {paragraphs.length ? (
          <details className="product-accordion" open>
            <summary>
              აღწერა <Icon name="plus" />
            </summary>
            {paragraphs.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </details>
        ) : null}
        {product.sku ? <p className="product-sku">არტიკული: {product.sku}</p> : null}
      </div>
    </div>
  );
}
