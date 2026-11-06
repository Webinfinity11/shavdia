"use client";

import Image from "next/image";
import Link from "next/link";
import { caps } from "@/lib/text";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useSyncExternalStore } from "react";
import { placeOrder, type CheckoutFields } from "@/app/(site)/checkout/actions";
import { money } from "@/lib/product";
import { applyCheckoutChanges, cartTotal, clearCart, useShopStore } from "@/lib/shop-store";

const FIELDS: { name: CheckoutFields; label: string; type?: string; autoComplete: string; inputMode?: "numeric" | "tel" | "email"; wide?: boolean; maxLength?: number }[] = [
  { name: "firstName", label: "სახელი", autoComplete: "given-name" },
  { name: "lastName", label: "გვარი", autoComplete: "family-name" },
  { name: "phone", label: "ტელეფონის ნომერი", type: "tel", autoComplete: "tel", inputMode: "tel" },
  { name: "personalId", label: "პირადი ნომერი", autoComplete: "off", inputMode: "numeric", maxLength: 11 },
  { name: "email", label: "ელფოსტა", type: "email", autoComplete: "email", inputMode: "email", wide: true },
  { name: "address", label: "მისამართი", autoComplete: "street-address" },
  { name: "city", label: "ქალაქი", autoComplete: "address-level2" },
];

const noSubscribe = () => () => {};

export function CheckoutForm() {
  const { cart } = useShopStore();
  const router = useRouter();
  const [state, action, pending] = useActionState(placeOrder, null);
  // The bag lives in the browser, so the first server render cannot know it.
  const ready = useSyncExternalStore(noSubscribe, () => true, () => false);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      clearCart();
      router.replace(`/order/${state.token}`);
    } else if (state.repriced?.length || state.removed?.length) {
      applyCheckoutChanges(state.repriced ?? [], state.removed ?? []);
    }
  }, [state, router]);

  if (!ready || state?.ok) return <p className="page-loading">იტვირთება…</p>;

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

  const errors = state && !state.ok ? state.fieldErrors : undefined;
  const items = cart.map(({ key, productId, size, color, quantity, price }) => ({ key, productId, size, color, quantity, price }));

  return (
    <form
      className="checkout-layout"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        // Dispatching by hand keeps what the visitor typed when a field needs fixing.
        startTransition(() => action(formData));
      }}
    >
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <section className="checkout-card" aria-labelledby="checkout-details">
        <h2 id="checkout-details">შენი მონაცემები</h2>
        {state && !state.ok ? (
          <p className="checkout-alert" role="alert">
            {state.message}
          </p>
        ) : null}
        <div className="checkout-fields">
          {FIELDS.map((field) => {
            const error = errors?.[field.name];
            return (
              <label key={field.name} className={`checkout-field${field.wide ? " is-wide" : ""}`}>
                <span>{field.label}</span>
                <input
                  name={field.name}
                  type={field.type ?? "text"}
                  autoComplete={field.autoComplete}
                  inputMode={field.inputMode}
                  maxLength={field.maxLength ?? 200}
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? `${field.name}-error` : undefined}
                />
                {error ? (
                  <small id={`${field.name}-error`} className="checkout-error">
                    {error}
                  </small>
                ) : null}
              </label>
            );
          })}
        </div>
      </section>

      <aside className="checkout-card checkout-summary" aria-labelledby="checkout-summary">
        <div className="checkout-summary-head">
          <h2 id="checkout-summary">შენი შეკვეთა</h2>
          <Link href="/cart" className="checkout-edit">
            კალათის შეცვლა
          </Link>
        </div>
        <ul className="checkout-items">
          {cart.map((item) => {
            const details = [item.color, item.size].filter(Boolean).join(" / ");
            return (
              <li key={item.key}>
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
          <strong>{money(cartTotal(cart))}</strong>
        </div>
        <button className="button checkout-submit" type="submit" disabled={pending}>
          {caps(pending ? "იგზავნება…" : "შეკვეთის დადასტურება")}
        </button>
        <p className="checkout-note">შეკვეთის მიღების შემდეგ დაგიკავშირდებით დეტალების დასაზუსტებლად.</p>
      </aside>
    </form>
  );
}
