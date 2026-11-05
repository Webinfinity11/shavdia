"use client";

import { useActionState, useState } from "react";
import { saveAbout, saveHome, saveSite } from "@/app/admin/actions";
import type { AboutContent, HomeContent, SiteInfo } from "@/lib/site-content";
import { GalleryField, SinglePhotoField } from "./photo-fields";

function Field({ name, label, value, hint, required = false }: { name: string; label: string; value: string; hint?: string; required?: boolean }) {
  return (
    <label className="admin-field">
      {label}
      <input className="admin-input" name={name} defaultValue={value} required={required} />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function Area({ name, label, value, rows = 4, hint }: { name: string; label: string; value: string; rows?: number; hint?: string }) {
  return (
    <label className="admin-field">
      {label}
      <textarea className="admin-input" name={name} defaultValue={value} rows={rows} style={{ minHeight: "auto" }} />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function SaveBar({ pending, state }: { pending: boolean; state: { ok: boolean; message: string } | null }) {
  return (
    <div className="admin-actions-bar">
      <button className="admin-btn" type="submit" disabled={pending}>
        {pending ? "ინახება…" : "შენახვა"}
      </button>
      {state?.message ? (
        <span className={`admin-note admin-note-${state.ok ? "ok" : "error"}`} style={{ margin: 0 }} role="alert">
          {state.message}
        </span>
      ) : null}
    </div>
  );
}

const LINK_HINT = "მაგალითად /shop ან /shop?category=kaba";

export function HomeForm({ content }: { content: HomeContent }) {
  const [state, action, pending] = useActionState(saveHome, null);

  return (
    <form action={action}>
      <section className="admin-card">
        <h2>მთავარი ბანერი</h2>
        <SinglePhotoField name="heroImage" label="დიდი ფოტო" initial={content.heroImage} />
        <div className="admin-grid">
          <Field name="heroCaption" label="წარწერა ფოტოზე" value={content.heroCaption} />
          <Field name="heroAlt" label="ფოტოს აღწერა" value={content.heroAlt} hint="Google-ისა და ეკრანის წამკითხველებისთვის" />
        </div>
      </section>

      <section className="admin-card">
        <h2>მარჯვენა ბლოკები</h2>
        <SinglePhotoField name="detailImage" label="ზედა ფოტო" initial={content.detailImage} />
        <Field name="detailAlt" label="ფოტოს აღწერა" value={content.detailAlt} />
        <div className="admin-grid">
          <Field name="editorialTitle" label="შავი ბლოკის სათაური" value={content.editorialTitle} required />
          <Field name="editorialButton" label="ღილაკის ტექსტი" value={content.editorialButton} required />
          <Field name="editorialLink" label="ღილაკის ბმული" value={content.editorialLink} hint={LINK_HINT} required />
        </div>
      </section>

      <section className="admin-card">
        <h2>პროდუქტების ბლოკი</h2>
        <div className="admin-grid">
          <Field name="collectionTitle" label="სათაური" value={content.collectionTitle} required />
        </div>
      </section>

      {content.tiles.slice(0, 2).map((tile, index) => (
        <section key={index} className="admin-card">
          <h2>ქვედა ბანერი {index + 1}</h2>
          <SinglePhotoField name={`tile${index}Image`} label="ფოტო" initial={tile.image} />
          <div className="admin-grid">
            <Field name={`tile${index}Label`} label="ტექსტი" value={tile.label} required />
            <Field name={`tile${index}Link`} label="ბმული" value={tile.link} hint={LINK_HINT} required />
          </div>
        </section>
      ))}

      <SaveBar pending={pending} state={state} />
    </form>
  );
}

export function SiteForm({ site }: { site: SiteInfo }) {
  const [state, action, pending] = useActionState(saveSite, null);
  const [stores, setStores] = useState(site.stores);
  const editStore = (index: number, change: Partial<SiteInfo["stores"][number]>) =>
    setStores((rows) => rows.map((row, position) => (position === index ? { ...row, ...change } : row)));

  return (
    <form action={action}>
      <input type="hidden" name="stores" value={JSON.stringify(stores)} />

      <section className="admin-card">
        <h2>ზედა განცხადება</h2>
        <Field name="announcement" label="ტექსტი" value={site.announcement} hint="ცარიელი ველის შემთხვევაში ზოლი არ გამოჩნდება" />
        <div className="admin-grid">
          <Field name="announcementLabel" label="ბმულის ტექსტი" value={site.announcementLabel} />
          <Field name="announcementLink" label="ბმული" value={site.announcementLink} hint={LINK_HINT} />
        </div>
      </section>

      <section className="admin-card">
        <h2>კონტაქტი</h2>
        <div className="admin-grid">
          <Field name="phone" label="ტელეფონი" value={site.phone} />
          <Field name="email" label="ელფოსტა" value={site.email} />
          <Field name="address" label="მისამართი ფუტერში" value={site.address} />
        </div>
        <div className="admin-grid">
          <Field name="facebook" label="Facebook" value={site.facebook} hint="სრული ბმული, https://-ით" />
          <Field name="instagram" label="Instagram" value={site.instagram} hint="სრული ბმული, https://-ით" />
        </div>
      </section>

      <section className="admin-card">
        <h2>მაღაზიები</h2>
        <Field name="contactTitle" label="გვერდის სათაური" value={site.contactTitle} required />
        {stores.map((store, index) => (
          <div key={index} className="admin-store-row">
            <input className="admin-input" aria-label="მაღაზიის სახელი" placeholder="სახელი" value={store.name} onChange={(event) => editStore(index, { name: event.target.value })} />
            <input className="admin-input" aria-label="მაღაზიის მისამართი" placeholder="მისამართი" value={store.address} onChange={(event) => editStore(index, { address: event.target.value })} />
            <button className="admin-btn admin-btn-danger admin-btn-small" type="button" onClick={() => setStores((rows) => rows.filter((_, position) => position !== index))}>
              წაშლა
            </button>
          </div>
        ))}
        <button className="admin-btn admin-btn-ghost admin-btn-small" type="button" style={{ marginBottom: 14 }} onClick={() => setStores((rows) => [...rows, { name: "", address: "" }])}>
          + მაღაზიის დამატება
        </button>
        <SinglePhotoField name="contactImage" label="გვერდის ფოტო" initial={site.contactImage} />
      </section>

      <section className="admin-card">
        <h2>ფუტერი და Google</h2>
        <Field name="copyright" label="საავტორო ხაზი" value={site.copyright} />
        <Field name="description" label="საიტის აღწერა Google-ისთვის" value={site.description} />
      </section>

      <SaveBar pending={pending} state={state} />
    </form>
  );
}

export function AboutForm({ about }: { about: AboutContent }) {
  const [state, action, pending] = useActionState(saveAbout, null);
  const [photos, setPhotos] = useState(about.photos);

  return (
    <form action={action}>
      <section className="admin-card">
        <Field name="title" label="სათაური" value={about.title} required />
        <SinglePhotoField name="image" label="ფოტო" initial={about.image} />
        <Area name="intro" label="შესავალი" value={about.intro} rows={7} hint="ფოტოს გვერდით ჩანს. ახალი აბზაცისთვის გამოიყენე ახალი ხაზი." />
        <Area name="story" label="ისტორია" value={about.story} rows={22} />
        <Field name="slogan" label="სლოგანი" value={about.slogan} />
      </section>
      <section className="admin-card">
        <h2>ფოტოები, მაქსიმუმ 3</h2>
        <input type="hidden" name="photos" value={JSON.stringify(photos)} />
        <GalleryField value={photos} onChange={setPhotos} />
      </section>
      <section className="admin-card">
        <h2>მაღალი ხარისხი და სტილი</h2>
        <div className="admin-grid">
          <Field name="featuresTitle" label="სათაური" value={about.featuresTitle} />
          <Field name="featuresSubtitle" label="ქვესათაური" value={about.featuresSubtitle} />
        </div>
        {about.features.slice(0, 4).map((feature, index) => (
          <div key={index} className="admin-grid">
            <Field name={`feature${index}Title`} label={`პუნქტი ${index + 1}: სათაური`} value={feature.title} />
            <Area name={`feature${index}Text`} label="ტექსტი" value={feature.text} rows={2} />
          </div>
        ))}
      </section>
      <SaveBar pending={pending} state={state} />
    </form>
  );
}
