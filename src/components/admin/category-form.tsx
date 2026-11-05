"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveCategory } from "@/app/admin/actions";
import { SinglePhotoField } from "./photo-fields";

type Values = { id: number; name: string; slug: string; description: string; image: string; sortOrder: number };

export function CategoryForm({ initial }: { initial?: Values }) {
  const [state, action, pending] = useActionState(saveCategory, null);

  return (
    <form className="admin-card" action={action}>
      <h2>{initial ? `შეცვლა: ${initial.name}` : "ახალი კატეგორია"}</h2>
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      {state?.message ? <p className={`admin-note admin-note-${state.ok ? "ok" : "error"}`} role="alert">{state.message}</p> : null}
      <div className="admin-grid">
        <label className="admin-field">
          სახელი *
          <input className="admin-input" name="name" required defaultValue={initial?.name} />
        </label>
        <label className="admin-field">
          ბმული
          <input className="admin-input" name="slug" placeholder="ივსება ავტომატურად" defaultValue={initial?.slug} />
        </label>
        <label className="admin-field">
          რიგითი ნომერი
          <input className="admin-input" type="number" name="sortOrder" defaultValue={initial?.sortOrder ?? 0} />
        </label>
      </div>
      <label className="admin-field">
        აღწერა
        <textarea className="admin-input" name="description" style={{ minHeight: 70 }} defaultValue={initial?.description} />
      </label>
      <SinglePhotoField name="image" label="ფოტო" initial={initial?.image ?? ""} optional />
      <div className="admin-checks">
        <button className="admin-btn" type="submit" disabled={pending}>
          {pending ? "ინახება…" : initial ? "შენახვა" : "დამატება"}
        </button>
        {initial ? (
          <Link className="admin-btn admin-btn-ghost" href="/admin/categories">
            გაუქმება
          </Link>
        ) : null}
      </div>
    </form>
  );
}
