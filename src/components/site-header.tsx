"use client";

import Image from "next/image";
import Link from "next/link";
import { caps } from "@/lib/text";
import { useEffect, useRef, useState } from "react";
import type { CategoryRef } from "@/lib/product";
import { useShopStore } from "@/lib/shop-store";
import { Icon } from "./icon";
import { useShop } from "./shop-provider";

export function SiteHeader({ categories }: { categories: CategoryRef[] }) {
  const { openDialog } = useShop();
  const { cart, wishlist } = useShopStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);
  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      toggle.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !toggle.current?.contains(target)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className="site-header">
        <nav className="header-links" aria-label="მთავარი მენიუ">
          <Link href="/shop">{caps("მაღაზია")}</Link>
          <Link href="/about">{caps("ჩვენ შესახებ")}</Link>
          <Link href="/contact">{caps("კონტაქტი")}</Link>
        </nav>
        <Link className="brand-link" href="/" aria-label="SHAVDIA, მთავარი გვერდი">
          <Image
            className="logo"
            src="/images/shavdia-logo.jpg"
            alt="SHAVDIA, MADE IN SAKARTVELO"
            width={1280}
            height={102}
            sizes="430px"
            loading="eager"
          />
        </Link>
        <div className="header-actions">
          <button
            ref={toggle}
            className="icon-button menu-toggle"
            type="button"
            aria-label={menuOpen ? "მენიუს დახურვა" : "მენიუს გახსნა"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name="menu" />
          </button>
          <button className="icon-button" type="button" aria-label="ძიება" onClick={() => openDialog("search")}>
            <Icon name="search" />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={`რჩეულები, ${wishlist.length} პროდუქტი`}
            onClick={() => openDialog("wishlist")}
          >
            <Icon name="heart" />
            <span id="wishlist-count" className="count-badge" aria-hidden="true">
              {wishlist.length || ""}
            </span>
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={`კალათა, ${cartQuantity} პროდუქტი`}
            onClick={() => openDialog("cart")}
          >
            <Icon name="bag" />
            <span id="cart-count" className="count-badge" aria-hidden="true">
              {cartQuantity || ""}
            </span>
          </button>
        </div>
      </header>
      <nav ref={menu} id="mobile-menu" className="mobile-menu" aria-label="მობილური მენიუ" hidden={!menuOpen}>
        <Link href="/shop" onClick={closeMenu}>
          {caps("ყველა პროდუქტი")}
        </Link>
        {categories.map((category) => (
          <Link key={category.slug} href={`/shop?category=${category.slug}`} onClick={closeMenu}>
            {caps(category.name)}
          </Link>
        ))}
        <Link href="/about" onClick={closeMenu}>
          {caps("ჩვენ შესახებ")}
        </Link>
        <Link href="/contact" onClick={closeMenu}>
          {caps("კონტაქტი")}
        </Link>
        <Link href="/cart" onClick={closeMenu}>
          {caps("კალათა")}
        </Link>
      </nav>
    </>
  );
}
