"use client";

import Image from "next/image";
import Link from "next/link";
import { caps } from "@/lib/text";
import { useEffect, useRef, useState } from "react";
import { currentPrice, money, needsChoice, type ProductSummary } from "@/lib/product";
import {
  addToCart,
  cartTotal,
  changeQuantity,
  MAX_QUANTITY,
  removeFromCart,
  toggleWishlist,
  useShopStore,
  type CartItem,
} from "@/lib/shop-store";
import { Icon } from "./icon";
import { useShop, type DialogName } from "./shop-provider";

type ShopDialogProps = {
  name: DialogName;
  id: string;
  className: string;
  labelledBy: string;
  children: React.ReactNode;
};

function ShopDialog({ name, id, className, labelledBy, children }: ShopDialogProps) {
  const { dialog, closeDialog, dialogDismissed } = useShop();
  const element = useRef<HTMLDialogElement>(null);
  const active = dialog === name;

  useEffect(() => {
    const current = element.current;
    if (!current) return;
    if (active && !current.open) current.showModal();
    if (!active && current.open) current.close();
  }, [active]);

  return (
    <dialog
      ref={element}
      id={id}
      className={`shop-dialog ${className}`}
      aria-labelledby={labelledBy}
      onClose={() => dialogDismissed(name)}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const outside =
          event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
        if (outside) closeDialog();
      }}
    >
      {children}
    </dialog>
  );
}

function DialogHeader({ id, title }: { id: string; title: string }) {
  const { closeDialog } = useShop();
  return (
    <div className="dialog-header">
      <h2 id={id}>{title}</h2>
      <button className="icon-button" type="button" aria-label="დახურვა" onClick={closeDialog}>
        <Icon name="close" />
      </button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  const { closeDialog } = useShop();
  return (
    <div className="dialog-empty">
      <p>{message}</p>
      <Link className="dialog-action" href="/shop" onClick={closeDialog}>
        {caps("კოლექციის ნახვა")}
      </Link>
    </div>
  );
}

function SearchBody() {
  const { closeDialog } = useShop();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ query: string; items: ProductSummary[] }>({ query: "", items: [] });
  const input = useRef<HTMLInputElement>(null);
  const term = query.trim();

  // Waits a frame because the dialog opens after this body has mounted.
  useEffect(() => {
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!term) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (res.ok) setResult({ query: term, items: await res.json() });
      } catch {
        // A newer search replaced this one, or the network failed. The previous results stay.
      }
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  const ready = term !== "" && result.query === term;

  return (
    <div className="dialog-body">
      <form className="search-form" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="sr-only" htmlFor="search-input">
          ძიება
        </label>
        <input
          ref={input}
          id="search-input"
          className="search-input"
          type="search"
          placeholder="მოძებნე პროდუქტი ან კატეგორია…"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="icon-button" type="submit" aria-label="ძიება">
          <Icon name="search" />
        </button>
      </form>
      <div id="search-results" aria-live="polite">
        {ready && result.items.length === 0 ? (
          <div className="dialog-empty">
            <p>ვერაფერი მოიძებნა. სცადე სხვა სიტყვა.</p>
          </div>
        ) : null}
        {ready
          ? result.items.map((product) => (
              <Link key={product.id} className="search-result" href={`/product/${product.slug}`} onClick={closeDialog}>
                {product.image ? <Image className="search-result-image" src={product.image} alt="" width={1000} height={1333} sizes="72px" /> : <span />}
                <span className="search-result-info">
                  <strong>{product.name}</strong>
                  <small>{product.categories[0]?.name}</small>
                </span>
                <span className="search-result-price">{money(currentPrice(product))}</span>
                <Icon name="arrow" />
              </Link>
            ))
          : null}
      </div>
    </div>
  );
}

function WishlistBody() {
  const { openDialog, closeDialog, showToast } = useShop();
  const { wishlist } = useShopStore();

  return (
    <div className="dialog-body">
      {wishlist.length === 0 ? (
        <EmptyState message="რჩეულები ჯერ ცარიელია." />
      ) : (
        wishlist.map((product) => (
          <article key={product.id} className="saved-item">
            {product.image ? <Image className="saved-item-image" src={product.image} alt={product.imageAlt} width={1000} height={1333} sizes="78px" /> : <span />}
            <div className="saved-item-info">
              <h3>
                <Link href={`/product/${product.slug}`} onClick={closeDialog}>
                  {product.name}
                </Link>
              </h3>
              <strong>{money(currentPrice(product))}</strong>
              <div className="saved-item-actions">
                {product.inStock && needsChoice(product) ? (
                  <Link className="dialog-action" href={`/product/${product.slug}`} onClick={closeDialog}>
                    არჩევა <Icon name="right" />
                  </Link>
                ) : (
                  <button
                    className="dialog-action"
                    type="button"
                    disabled={!product.inStock}
                    onClick={() => {
                      if (addToCart(product, product.sizes[0] ?? "", product.colors[0]?.name ?? "")) openDialog("cart");
                      else showToast(`ერთი პროდუქტის მაქსიმალური რაოდენობაა ${MAX_QUANTITY}.`);
                    }}
                  >
                    კალათაში <Icon name="plus" />
                  </button>
                )}
                <button
                  className="remove-item"
                  type="button"
                  aria-label={`${product.name}: რჩეულებიდან წაშლა`}
                  onClick={() => {
                    toggleWishlist(product);
                    showToast("წაიშალა რჩეულებიდან.");
                  }}
                >
                  წაშლა
                </button>
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

function CartRow({ item, onRemoved }: { item: CartItem; onRemoved: () => void }) {
  const { closeDialog } = useShop();
  const details = [item.color, item.size].filter(Boolean).join(" / ");

  return (
    <article className="cart-item">
      {item.image ? <Image className="cart-item-image" src={item.image} alt={item.name} width={1000} height={1333} sizes="78px" /> : <span />}
      <div className="cart-item-info">
        <h3>
          <Link href={`/product/${item.slug}`} onClick={closeDialog}>
            {item.name}
          </Link>
        </h3>
        {details ? <p className="cart-item-meta">{details}</p> : null}
        <strong>{money(item.price * item.quantity)}</strong>
        <div className="cart-item-controls">
          <div className="quantity-control" role="group" aria-label={`${item.name}: რაოდენობა`}>
            <button
              className="quantity-button"
              type="button"
              aria-label="შემცირება"
              onClick={() => {
                changeQuantity(item.key, -1);
                if (item.quantity === 1) onRemoved();
              }}
            >
              <Icon name="minus" />
            </button>
            <span aria-live="polite">{item.quantity}</span>
            <button
              className="quantity-button"
              type="button"
              aria-label="გაზრდა"
              disabled={item.quantity >= MAX_QUANTITY}
              onClick={() => changeQuantity(item.key, 1)}
            >
              <Icon name="plus" />
            </button>
          </div>
          <button
            className="remove-item"
            type="button"
            aria-label={`${item.name}: კალათიდან წაშლა`}
            onClick={() => {
              removeFromCart(item.key);
              onRemoved();
            }}
          >
            წაშლა
          </button>
        </div>
      </div>
    </article>
  );
}

function CartDialog() {
  const { closeDialog } = useShop();
  const { cart } = useShopStore();
  const cartLink = useRef<HTMLAnchorElement>(null);

  return (
    <ShopDialog name="cart" id="cart-dialog" className="drawer-dialog" labelledBy="cart-title">
      <DialogHeader id="cart-title" title="შენი კალათა" />
      <div className="dialog-body">
        {cart.length === 0 ? (
          <EmptyState message="კალათა ცარიელია." />
        ) : (
          cart.map((item) => <CartRow key={item.key} item={item} onRemoved={() => cartLink.current?.focus()} />)
        )}
      </div>
      {cart.length ? (
        <div className="cart-footer">
          <div className="cart-total">
            <span>ჯამი</span>
            <strong id="cart-subtotal">{money(cartTotal(cart))}</strong>
          </div>
          <Link ref={cartLink} className="button button-outline" href="/cart" onClick={closeDialog}>
            {caps("კალათის ნახვა")}
          </Link>
          <Link className="button cart-checkout" href="/checkout" onClick={closeDialog}>
            {caps("შეკვეთის გაფორმება")} <Icon name="right" />
          </Link>
        </div>
      ) : null}
    </ShopDialog>
  );
}

export function ShopDialogs() {
  const { dialog, closeDialog } = useShop();

  return (
    <>
      <ShopDialog name="search" id="search-dialog" className="search-dialog" labelledBy="search-title">
        <DialogHeader id="search-title" title="იპოვე შენი ფავორიტები" />
        {dialog === "search" ? <SearchBody /> : null}
      </ShopDialog>

      <ShopDialog name="wishlist" id="wishlist-dialog" className="drawer-dialog" labelledBy="wishlist-title">
        <DialogHeader id="wishlist-title" title="შენი რჩეულები" />
        {dialog === "wishlist" ? <WishlistBody /> : null}
        <div className="cart-footer">
          <button className="button" type="button" onClick={closeDialog}>
            {caps("შოპინგის გაგრძელება")}
          </button>
        </div>
      </ShopDialog>

      <CartDialog />
    </>
  );
}
