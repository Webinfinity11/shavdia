import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/icon";
import { db } from "@/lib/db";
import { money } from "@/lib/product";

export const metadata: Metadata = { title: "შეკვეთა მიღებულია", robots: { index: false, follow: false } };

type Props = { params: Promise<{ token: string }> };

async function OrderContent({ params }: Props) {
  const { token } = await params;
  const order = await db.order.findUnique({ where: { token }, include: { items: { orderBy: { id: "asc" } } } });
  if (!order) notFound();

  return (
    <div className="order-done">
      <div className="order-done-card">
        <p className="eyebrow">შეკვეთა #{order.id}</p>
        <h1>მადლობა, შეკვეთა მიღებულია</h1>
        <p>მალე დაგიკავშირდებით დეტალების დასაზუსტებლად.</p>
        <Link href="/shop" className="button button-light">
          მაღაზიაში დაბრუნება <Icon name="right" />
        </Link>
      </div>
      <section className="checkout-card" aria-label="შეკვეთის შიგთავსი">
        <ul className="checkout-items">
          {order.items.map((item) => {
            const details = [item.color, item.size].filter(Boolean).join(" / ");
            return (
              <li key={item.id}>
                <span className="checkout-thumb">
                  {item.image ? <Image src={item.image} alt="" width={1000} height={1333} sizes="64px" /> : null}
                  <b>{item.quantity}</b>
                </span>
                <span className="checkout-item-name">
                  {item.name}
                  {details ? <small>{details}</small> : null}
                </span>
                <strong>{money(item.price * item.quantity)}</strong>
              </li>
            );
          })}
        </ul>
        <div className="cart-total">
          <span>ჯამი</span>
          <strong>{money(order.total)}</strong>
        </div>
      </section>
    </div>
  );
}

export default function OrderPage({ params }: Props) {
  return (
    <main id="content" className="page-shell inner-page">
      <Suspense fallback={<p className="page-loading">იტვირთება…</p>}>
        <OrderContent params={params} />
      </Suspense>
    </main>
  );
}
