"use client";

import Image from "next/image";
import { useState } from "react";
import { uploadImage } from "@/app/admin/actions";

/** Uploads files one at a time, so one bad file does not lose the others. */
async function uploadAll(files: FileList, onUploaded: (url: string) => void, onError: (message: string) => void) {
  const errors: string[] = [];
  for (const file of Array.from(files)) {
    const formData = new FormData();
    formData.set("file", file);
    try {
      const result = await uploadImage(formData);
      if (result.url) onUploaded(result.url);
      if (result.error) errors.push(result.error);
    } catch {
      errors.push(`${file.name}: ფოტო ვერ აიტვირთა.`);
    }
  }
  onError(errors.join(" "));
}

type GalleryProps = { value: string[]; onChange: (update: (images: string[]) => string[]) => void };

/** Product photos. The first one is the main photo. */
export function GalleryField({ value, onChange }: GalleryProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const move = (index: number, step: number) =>
    onChange((images) => {
      const next = [...images];
      const [item] = next.splice(index, 1);
      next.splice(index + step, 0, item);
      return next;
    });

  return (
    <>
      {error ? <p className="admin-note admin-note-error" role="alert">{error}</p> : null}
      <div className="admin-photos">
        {value.map((url, index) => (
          <div key={url} className="admin-photo">
            <Image src={url} alt={`ფოტო ${index + 1}`} width={1000} height={1333} sizes="160px" />
            {index === 0 ? <span className="admin-photo-main">მთავარი</span> : null}
            <div className="admin-photo-actions">
              <button type="button" aria-label="მარცხნივ გადატანა" disabled={index === 0} onClick={() => move(index, -1)}>←</button>
              <button type="button" aria-label="მარჯვნივ გადატანა" disabled={index === value.length - 1} onClick={() => move(index, 1)}>→</button>
              <button type="button" aria-label="ფოტოს წაშლა" onClick={() => onChange((images) => images.filter((other) => other !== url))}>✕</button>
            </div>
          </div>
        ))}
        <label className="admin-upload">
          {busy ? "იტვირთება…" : "+ ფოტოების დამატება"}
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            disabled={busy}
            onChange={async (event) => {
              const files = event.target.files;
              if (!files?.length) return;
              setBusy(true);
              await uploadAll(files, (url) => onChange((images) => [...images, url]), setError);
              setBusy(false);
              event.target.value = "";
            }}
          />
        </label>
      </div>
    </>
  );
}

type SingleProps = { name: string; label: string; initial: string; optional?: boolean };

/** One photo, submitted with the surrounding form through a hidden field. */
export function SinglePhotoField({ name, label, initial, optional = false }: SingleProps) {
  const [url, setUrl] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="admin-field">
      {label}
      <input type="hidden" name={name} value={url} />
      {error ? <p className="admin-note admin-note-error" role="alert">{error}</p> : null}
      <div className="admin-single-photo">
        {url ? <Image src={url} alt="" width={1000} height={1333} sizes="90px" /> : null}
        <label className="admin-btn admin-btn-ghost admin-btn-small">
          {busy ? "იტვირთება…" : url ? "შეცვლა" : "ატვირთვა"}
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            disabled={busy}
            onChange={async (event) => {
              const files = event.target.files;
              if (!files?.length) return;
              setBusy(true);
              await uploadAll(files, setUrl, setError);
              setBusy(false);
              event.target.value = "";
            }}
          />
        </label>
        {optional && url ? (
          <button className="admin-btn admin-btn-danger admin-btn-small" type="button" onClick={() => setUrl("")}>
            წაშლა
          </button>
        ) : null}
      </div>
    </div>
  );
}
