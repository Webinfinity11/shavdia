import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout-form";

export const metadata: Metadata = { title: "შეკვეთის გაფორმება", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return (
    <main id="content" className="page-shell inner-page">
      <header className="page-heading">
        <h1 className="section-title">შეკვეთის გაფორმება</h1>
      </header>
      <CheckoutForm />
    </main>
  );
}
