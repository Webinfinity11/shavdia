"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "მთავარი" },
  { href: "/admin/orders", label: "შეკვეთები" },
  { href: "/admin/products", label: "პროდუქტები" },
  { href: "/admin/categories", label: "კატეგორიები" },
  { href: "/admin/home", label: "მთავარი გვერდი" },
  { href: "/admin/about", label: "ჩვენ შესახებ" },
  { href: "/admin/settings", label: "კონტაქტი და პარამეტრები" },
];

/** Shown until the current path is known, so the menu never disappears while loading. */
export function AdminNavLinks({ pathname }: { pathname?: string }) {
  return (
    <nav className="admin-nav" aria-label="ადმინის მენიუ">
      {LINKS.map((link) => {
        const active = pathname !== undefined && (link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href));
        return (
          <Link key={link.href} href={link.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
            {link.label}
          </Link>
        );
      })}
      <a href="/" target="_blank" rel="noreferrer">
        საიტის ნახვა ↗
      </a>
    </nav>
  );
}

export function AdminNav() {
  return <AdminNavLinks pathname={usePathname()} />;
}
