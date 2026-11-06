import type { Metadata } from "next";
import { CartPage } from "@/components/cart-page";

export const metadata: Metadata = { title: "კალათა", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <main id="content" className="page-shell inner-page">
      <header className="page-heading">
        <h1 className="section-title">კალათა</h1>
      </header>
      <CartPage />
    </main>
  );
}
