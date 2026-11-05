import type { Metadata } from "next";
import Image from "next/image";
import { getSiteInfo } from "@/lib/site-content";

export const metadata: Metadata = { title: "კონტაქტი" };

export default async function ContactPage() {
  const site = await getSiteInfo();
  return (
    <main id="content" className="page-shell inner-page">
      <header className="page-heading">
        <h1 className="section-title">{site.contactTitle}</h1>
      </header>
      <div className="contact-layout">
        <div>
          <div className="contact-direct">
            {site.phone ? <a href={`tel:${site.phone.replace(/\s/g, "")}`}>{site.phone}</a> : null}
            {site.email ? <a href={`mailto:${site.email}`}>{site.email}</a> : null}
            {site.facebook ? (
              <a href={site.facebook} target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
            ) : null}
            {site.instagram ? (
              <a href={site.instagram} target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            ) : null}
          </div>
          <div className="stores-grid">
            {site.stores.map((store) => (
              <article key={store.name} className="store-card">
                <h2>{store.name}</h2>
                <p>{store.address}</p>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`} target="_blank" rel="noopener noreferrer">
                  რუკაზე ნახვა
                </a>
              </article>
            ))}
          </div>
        </div>
        <div className="contact-photo">
          <Image src={site.contactImage} alt="SHAVDIA" width={500} height={601} sizes="(max-width: 900px) 100vw, 500px" />
        </div>
      </div>
    </main>
  );
}
