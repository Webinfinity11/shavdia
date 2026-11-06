"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { currentPrice, money, type ProductDetail } from "@/lib/product";
import { caps } from "@/lib/text";
import { Icon } from "./icon";

const MAX_SIDE = 1600;

/** Shrinks the photo before upload. It also applies phone rotation and catches unreadable files. */
async function preparePhoto(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("empty"))), "image/jpeg", 0.9);
  });
}

type Props = { product: ProductDetail; onAddToCart: () => void };

export function TryOn({ product, onAddToCart }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef<AbortController | null>(null);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => () => request.current?.abort(), []);

  const reset = () => {
    if (photo) URL.revokeObjectURL(photo.url);
    if (result) URL.revokeObjectURL(result);
    setPhoto(null);
    setResult(null);
    setError("");
  };

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    reset();
    try {
      const blob = await preparePhoto(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setError("ეს ფაილი ფოტოდ ვერ წავიკითხეთ. აირჩიე JPG ან PNG ფოტო.");
    }
  };

  const tryOn = async () => {
    if (!photo || !consent || busy) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.set("productId", String(product.id));
      body.set("consent", "1");
      body.set("photo", new File([photo.blob], "photo.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/try-on", { method: "POST", body, signal: controller.signal });
      if (!res.ok) {
        const answer = await res.json().catch(() => null);
        setError(answer?.error ?? "მოზომება ვერ მოხერხდა. სცადე ცოტა ხანში.");
        return;
      }
      setResult(URL.createObjectURL(await res.blob()));
    } catch (failure) {
      if (!(failure instanceof DOMException && failure.name === "AbortError")) {
        setError("კავშირი გაწყდა. სცადე თავიდან.");
      }
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    request.current?.abort();
    dialog.current?.close();
  };

  return (
    <>
      <button className="button button-outline try-on-open" type="button" onClick={() => dialog.current?.showModal()}>
        <Icon name="camera" /> {caps("მოიზომე შენს ფოტოზე")}
      </button>

      <dialog
        ref={dialog}
        className="shop-dialog try-on-dialog"
        aria-labelledby="try-on-title"
        onClose={() => request.current?.abort()}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <button className="icon-button close-dialog" type="button" aria-label="დახურვა" onClick={close}>
          <Icon name="close" />
        </button>
        <div className="try-on-grid">
          <div className={`try-on-stage${busy ? " is-busy" : ""}`}>
            {result ? (
              // eslint-disable-next-line @next/next/no-img-element -- temporary image made in the browser session
              <img src={result} alt={`${product.name} შენს ფოტოზე`} />
            ) : photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- the visitor's own photo, kept in the browser
              <img src={photo.url} alt="შენი ფოტო" />
            ) : (
              <label className="try-on-drop">
                <Icon name="camera" />
                <strong>ატვირთე შენი ფოტო</strong>
                <span>უკეთესი შედეგისთვის აირჩიე ფოტო, სადაც მთლიანად ჩანხარ, კარგ განათებაზე.</span>
                <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choosePhoto(event.target.files?.[0])} />
              </label>
            )}
            {busy ? <p className="try-on-progress">მზადდება, ჩვეულებრივ 15–30 წამი…</p> : null}
          </div>

          <div className="try-on-side">
            <h2 id="try-on-title">{result ? "ასე მოგიხდება" : "მოიზომე შენს ფოტოზე"}</h2>
            <div className="try-on-product">
              {product.image ? <Image src={product.image} alt="" width={1000} height={1333} sizes="72px" /> : null}
              <span>
                {product.name}
                <strong>{money(currentPrice(product))}</strong>
              </span>
            </div>

            {error ? (
              <p className="checkout-alert" role="alert">
                {error}
              </p>
            ) : null}

            {result ? (
              <>
                <p className="try-on-note">სურათი შექმნილია ხელოვნური ინტელექტით და ზომასა და ფერს შეიძლება ზუსტად არ ასახავდეს.</p>
                <button
                  className="button"
                  type="button"
                  disabled={!product.inStock}
                  onClick={() => {
                    close();
                    onAddToCart();
                  }}
                >
                  {caps(product.inStock ? "კალათაში დამატება +" : "მარაგში არ არის")}
                </button>
                <a className="button button-outline" href={result} download={`shavdia-${product.slug}.jpg`}>
                  {caps("ფოტოს შენახვა")}
                </a>
                <button className="try-on-link" type="button" onClick={reset}>
                  სხვა ფოტოს ცდა
                </button>
              </>
            ) : (
              <>
                <label className="try-on-consent">
                  <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
                  <span>ეს ჩემი ფოტოა ან მისი გამოყენების უფლება მაქვს. ფოტოზე არასრულწლოვანი არ არის.</span>
                </label>
                <button className="button" type="button" disabled={!photo || !consent || busy} onClick={tryOn}>
                  {caps(busy ? "მზადდება…" : "მოზომება")}
                </button>
                {photo && !busy ? (
                  <button className="try-on-link" type="button" onClick={reset}>
                    სხვა ფოტოს არჩევა
                  </button>
                ) : null}
                <p className="try-on-note">ფოტო დასამუშავებლად იგზავნება Google Gemini-ზე. ჩვენს საიტზე არ ინახება.</p>
              </>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
