import type { Metadata } from "next";
import Link from "next/link";
import { ShopDialogs } from "@/components/shop-dialogs";
import { ShopProvider } from "@/components/shop-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCategories } from "@/lib/catalog";
import { getSiteInfo } from "@/lib/site-content";

export async function generateMetadata(): Promise<Metadata> {
  const { description } = await getSiteInfo();
  return { description };
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [categories, site] = await Promise.all([getCategories(), getSiteInfo()]);
  return (
    <ShopProvider>
      <a className="skip-link sr-only" href="#content">
        კონტენტზე გადასვლა
      </a>
      {site.announcement ? (
        <p className="announcement">
          {site.announcement}
          {site.announcementLabel && site.announcementLink ? <Link href={site.announcementLink}>{site.announcementLabel}</Link> : null}
        </p>
      ) : null}
      <SiteHeader categories={categories.map(({ name, slug }) => ({ name, slug }))} />
      {children}
      <SiteFooter site={site} />
      <ShopDialogs />
    </ShopProvider>
  );
}
