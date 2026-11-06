"use client";

import Image from "next/image";
import Link from "next/link";
import { caps } from "@/lib/text";
import { useRef, useSyncExternalStore } from "react";
import { money } from "@/lib/product";
import { cartTotal, changeQuantity, MAX_QUANTITY, removeFromCart, useShopStore } from "@/lib/shop-store";
import { Icon } from "./icon";

const noSubscribe = () => () => {};

export function CartPage() {
  const { cart } = useShopStore();
  const checkout = useRef<HTMLAnchorElement>(null);
  // The bag lives in the browser, so the first server render cannot know it.
  const ready = useSyncExternalStore(noSubscribe, () => true, () => false);

  if (!ready) return <p className="page-loading">იტვირთება…</p>;

  if (!cart.length) {
    return (
      <div className="checkout-empty">
        <p>კალათა ცარიელია.</p>
        <Link href="/shop" className="button">
          {caps("მაღაზიაში გადასვლა")}
        </Link>
      </div>
    );
  }

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="checkout-layout">
      <section className="checkout-card" aria-label="კალათის პროდუქტები">
        <ul className="cart-page-list">
          {cart.map((item) => {
            const details = [item.color, item.size].filter(Boolean).join(" / ");
            const href = `/product/${item.slug}`;
            return (
              <li key={item.key} className="cart-page-row">
                <Link href={href} className="cart-page-photo" aria-label={item.name}>
                  {item.image ? <Image src={item.image} alt="" width={1000} height={1333} sizes="110px" /> : null}
                </Link>
                <div className="cart-page-info">
                  <h2>
                    <Link href={href}>{item.name}</Link>
                  </h2>
                  {details ? <p className="cart-item-meta">{details}</p> : null}
                  <p className="cart-page-price">{money(item.price)}</p>
                  <button
                    className="remove-item"
                    type="button"
                    aria-label={`${item.name}: კალათიდან წაშლა`}
                    onClick={() => {
                      removeFromCart(item.key);
                      checkout.current?.focus();
                    }}
                  >
                    წაშლა
                  </button>
                </div>
                <div className="quantity-control" role="group" aria-label={`${item.name}: რაოდენობა`}>
                  <button
                    className="quantity-button"
                    type="button"
                    aria-label="შემცირება"
                    onClick={() => {
                      changeQuantity(item.key, -1);
                      if (item.quantity === 1) checkout.current?.focus();
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
                <strong className="cart-page-line">{money(item.price * item.quantity)}</strong>
              </li>
            );
          })}
        </ul>
      </section>

      <aside className="checkout-card checkout-summary" aria-labelledby="cart-summary">
        <h2 id="cart-summary">შეჯამება</h2>
        <div className="cart-page-count">
          <span>პროდუქტები</span>
          <span>{count}</span>
        </div>
        <div className="cart-total">
          <span>ჯამი</span>
          <strong>{money(cartTotal(cart))}</strong>
        </div>
        <Link ref={checkout} href="/checkout" className="button checkout-submit">
          {caps("შეკვეთის გაფორმება")} <Icon name="right" />
        </Link>
        <Link href="/shop" className="cart-page-continue">
          შოპინგის გაგრძელება
        </Link>
      </aside>
    </div>
  );
}
