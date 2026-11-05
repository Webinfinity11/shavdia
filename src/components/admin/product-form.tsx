"use client";

import { useActionState, useState } from "react";
import { saveProduct } from "@/app/admin/actions";
import type { ColorOption } from "@/lib/product";
import { GalleryField } from "./photo-fields";

export type ProductFormValues = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  price: string;
  salePrice: string;
  stockQuantity: string;
  stockStatus: "instock" | "outofstock";
  status: "published" | "draft";
  featured: boolean;
  categoryIds: number[];
  images: string[];
  sizes: string[];
  colors: ColorOption[];
};

const QUICK_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

type Props = { categories: { id: number; name: string }[]; initial?: ProductFormValues };

export function ProductForm({ categories, initial }: Props) {
  const [state, action, pending] = useActionState(saveProduct, null);
  const [images, setImages] = useState(initial?.images ?? []);
  const [sizes, setSizes] = useState((initial?.sizes ?? []).join(", "));
  const [colors, setColors] = useState<ColorOption[]>(initial?.colors ?? []);

  const sizeList = sizes.split(",").map((size) => size.trim()).filter(Boolean);
  const toggleSize = (size: string) =>
    setSizes((sizeList.includes(size) ? sizeList.filter((other) => other !== size) : [...sizeList, size]).join(", "));
  const editColor = (index: number, change: Partial<ColorOption>) =>
    setColors((rows) => rows.map((row, position) => (position === index ? { ...row, ...change } : row)));

  return (
    <form action={action}>
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input type="hidden" name="colors" value={JSON.stringify(colors)} />
      {state?.message ? <p className={`admin-note admin-note-${state.ok ? "ok" : "error"}`} role="alert">{state.message}</p> : null}

      <section className="admin-card">
        <h2>ძირითადი</h2>
        <label className="admin-field">
          სახელი *
          <input className="admin-input" name="name" required defaultValue={initial?.name} />
        </label>
        <label className="admin-field">
          მოკლე აღწერა
          <textarea className="admin-input" name="shortDescription" style={{ minHeight: 70 }} defaultValue={initial?.shortDescription} />
        </label>
        <label className="admin-field">
          აღწერა
          <textarea className="admin-input" name="description" defaultValue={initial?.description} />
          <small>ტექსტი ჩანს აბზაცებად. ახალი აბზაცისთვის გამოიყენე ახალი ხაზი.</small>
        </label>
      </section>

      <section className="admin-card">
        <h2>ფოტოები</h2>
        <GalleryField value={images} onChange={setImages} />
      </section>

      <section className="admin-card">
        <h2>ფასი და მარაგი</h2>
        <div className="admin-grid">
          <label className="admin-field">
            ფასი, ₾ *
            <input className="admin-input" name="price" inputMode="decimal" required defaultValue={initial?.price} />
          </label>
          <label className="admin-field">
            ფასდაკლებული ფასი, ₾
            <input className="admin-input" name="salePrice" inputMode="decimal" defaultValue={initial?.salePrice} />
          </label>
          <label className="admin-field">
            არტიკული
            <input className="admin-input" name="sku" defaultValue={initial?.sku} />
          </label>
          <label className="admin-field">
            რაოდენობა
            <input className="admin-input" name="stockQuantity" inputMode="numeric" defaultValue={initial?.stockQuantity} />
            <small>ინფორმაციისთვის. შეკვეთის გაფორმება ჯერ არ ამცირებს.</small>
          </label>
          <label className="admin-field">
            მარაგი
            <select className="admin-input" name="stockStatus" defaultValue={initial?.stockStatus ?? "instock"}>
              <option value="instock">მარაგშია</option>
              <option value="outofstock">არ არის მარაგში</option>
            </select>
          </label>
        </div>
      </section>

      <section className="admin-card">
        <h2>ზომები</h2>
        <div className="admin-checks" style={{ marginBottom: 12 }}>
          {QUICK_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={`admin-chip${sizeList.includes(size) ? " is-active" : ""}`}
              aria-pressed={sizeList.includes(size)}
              onClick={() => toggleSize(size)}
            >
              {size}
            </button>
          ))}
        </div>
        <label className="admin-field">
          ყველა ზომა, მძიმით
          <input className="admin-input" name="sizes" placeholder="მაგალითად: 40, 41, 42" value={sizes} onChange={(event) => setSizes(event.target.value)} />
        </label>
      </section>

      <section className="admin-card">
        <h2>ფერები</h2>
        {colors.map((color, index) => (
          <div key={index} className="admin-color-row">
            <input type="color" aria-label="ფერი" value={color.hex} onChange={(event) => editColor(index, { hex: event.target.value })} />
            <input className="admin-input" aria-label="ფერის სახელი" placeholder="მაგალითად: შავი" value={color.name} onChange={(event) => editColor(index, { name: event.target.value })} />
            <button className="admin-btn admin-btn-danger admin-btn-small" type="button" onClick={() => setColors((rows) => rows.filter((_, position) => position !== index))}>
              წაშლა
            </button>
          </div>
        ))}
        <button className="admin-btn admin-btn-ghost admin-btn-small" type="button" onClick={() => setColors((rows) => [...rows, { name: "", hex: "#111111" }])}>
          + ფერის დამატება
        </button>
      </section>

      <section className="admin-card">
        <h2>კატეგორიები</h2>
        <div className="admin-checks">
          {categories.map((category) => (
            <label key={category.id} className="admin-check">
              <input type="checkbox" name="categories" value={category.id} defaultChecked={initial?.categoryIds.includes(category.id)} />
              {category.name}
            </label>
          ))}
        </div>
      </section>

      <section className="admin-card">
        <h2>გამოქვეყნება</h2>
        <div className="admin-grid">
          <label className="admin-field">
            სტატუსი
            <select className="admin-input" name="status" defaultValue={initial?.status ?? "published"}>
              <option value="published">გამოქვეყნებული</option>
              <option value="draft">დრაფტი, საიტზე არ ჩანს</option>
            </select>
          </label>
          <label className="admin-field">
            ბმული
            <input className="admin-input" name="slug" defaultValue={initial?.slug} placeholder="ივსება ავტომატურად" />
          </label>
        </div>
        <label className="admin-check">
          <input type="checkbox" name="featured" defaultChecked={initial?.featured} />
          გამოჩნდეს პირველი მთავარ გვერდზე
        </label>
      </section>

      <div className="admin-actions-bar">
        <button className="admin-btn" type="submit" disabled={pending}>
          {pending ? "ინახება…" : "შენახვა"}
        </button>
      </div>
    </form>
  );
}
