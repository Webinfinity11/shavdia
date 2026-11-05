import Image from "next/image";
import Link from "next/link";
import type { SiteInfo } from "@/lib/site-content";

export function SiteFooter({ site }: { site: SiteInfo }) {
  return (
    <footer className="site-footer">
      <Link className="footer-brand" href="/" aria-label="SHAVDIA, მთავარი გვერდი">
        <Image src="/images/shavdia-logo.jpg" alt="SHAVDIA, MADE IN SAKARTVELO" width={1280} height={102} sizes="410px" />
      </Link>
      <nav className="footer-links" aria-label="ფუტერის მენიუ">
        <Link href="/shop">მაღაზია</Link>
        <Link href="/about">ჩვენ შესახებ</Link>
        <Link href="/contact">კონტაქტი</Link>
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
      </nav>
      <div className="footer-bottom">
        <span>{site.address}</span>
        <span>{site.copyright}</span>
      </div>
    </footer>
  );
}
