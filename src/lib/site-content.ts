import { cacheLife, cacheTag } from "next/cache";
import aboutDefaults from "@/data/about.json";
import { db } from "@/lib/db";

export const CONTENT_TAG = "content";

export type HomeTile = { image: string; label: string; link: string };
export type HomeFeature = { title: string; text: string };

export type HomeContent = {
  heroImage: string;
  heroAlt: string;
  heroCaption: string;
  detailImage: string;
  detailAlt: string;
  editorialTitle: string;
  editorialButton: string;
  editorialLink: string;
  collectionTitle: string;
  tiles: HomeTile[];
};

export type StoreInfo = { name: string; address: string };

export type SiteInfo = {
  description: string;
  announcement: string;
  announcementLabel: string;
  announcementLink: string;
  contactTitle: string;
  contactImage: string;
  phone: string;
  email: string;
  address: string;
  instagram: string;
  facebook: string;
  copyright: string;
  stores: StoreInfo[];
};

export type AboutContent = {
  title: string;
  image: string;
  intro: string;
  story: string;
  photos: string[];
  slogan: string;
  featuresTitle: string;
  featuresSubtitle: string;
  features: HomeFeature[];
};

export const DEFAULT_HOME: HomeContent = {
  heroImage: "/images/home/hero-image.webp",
  heroAlt: "SHAVDIA-ს შავი მაისური ქართული წარწერით",
  heroCaption: "",
  detailImage: "/images/home/gallery-3.webp",
  detailAlt: "SHAVDIA-ს მაისური ქართული დროშით",
  editorialTitle: "აღმოაჩინე ახალი კოლექცია",
  editorialButton: "მეტის ნახვა",
  editorialLink: "/shop",
  collectionTitle: "პოპულარული პროდუქტები",
  tiles: [
    { image: "/images/home/collection.webp", label: "კაცის", link: "/shop" },
    { image: "/images/home/gallery-2.webp", label: "ქალის", link: "/shop" },
  ],
};

export const DEFAULT_SITE: SiteInfo = {
  description: "SHAVDIA, დამზადებულია საქართველოში. ატარე შენი წილი საქართველო.",
  announcement: "",
  announcementLabel: "",
  announcementLink: "/shop",
  contactTitle: "მისამართები",
  contactImage: "/images/contact/image.webp",
  phone: "+995 555 50 92 98",
  email: "info@shavdia.ge",
  address: "თბილისი შოთა რუსთაველის 2/4, გალერეა თბილისი მე-3 სართული",
  instagram: "",
  facebook: "https://www.facebook.com/Georgiandesingers/?locale=ka_GE",
  copyright: "Copyright © 2024 Created by INFINITY. All Rights Reserved",
  stores: [
    { name: "გალერეა თბილისი", address: "თბილისი, რუსთაველი 2/4, სავაჭრო ცენტრი გალერეა თბილისი" },
    { name: "თბილისი მოლი", address: "თბილისი, 16კმ აღმაშენებლის გამზირი, სავაჭრო ცენტრი თბილისი მოლი" },
    { name: "სითი მოლი", address: "თბილისი, პეტრე ქავთარაძის 1, ვაჟა ფშაველას 70, სავაჭრო ცენტრი სითი მოლი" },
    { name: "მეტრო სითი", address: "ბათუმი, ლეხ და მარაია კაჩინსკების 1, სავაჭრო ცენტრი მეტრო სითი" },
  ],
};

export const DEFAULT_ABOUT: AboutContent = {
  ...aboutDefaults,
  photos: [1, 2, 3].map((number) => `/images/about/photo-${number}.webp`),
  slogan: "ატარე შენი წილი საქართველო",
  featuresTitle: "მაღალი ხარისხი და სტილი",
  featuresSubtitle: "ჩვენი კოლექცია აერთიანებს თანამედროვე დიზაინს, კომფორტს და ხელმისაწვდომ ფასებს",
  features: [
    {
      title: "პროდუქტის მოთხოვნა",
      text: "ჩვენი მაღაზია გთავაზობთ მაღალი ხარისხის ტანსაცმელს, რომელიც შექმნილია თანამედროვე მოდის ტენდენციების გათვალისწინებით.",
    },
    {
      title: "ტრენდული პროდუქტები",
      text: "აღმოაჩინეთ უახლესი ტენდენციები ჩვენს კოლექციაში. ყოველ კვირას ვამატებთ ახალ მოდელებს, რომლებიც შეესაბამება თანამედროვე სტილს და კომფორტს.",
    },
    { title: "დროული მიტანა", text: "ჩვენი სწრაფი მიტანის სერვისი უზრუნველყოფს, რომ თქვენი შეკვეთა მოგეწოდებათ დროულად." },
    { title: "ონლაინ მხარდაჭერა", text: "ჩვენი მომხმარებელთა მხარდაჭერის გუნდი მზადაა დაგეხმაროთ ნებისმიერ კითხვაზე." },
  ],
};

export async function readSetting(key: string): Promise<Record<string, unknown>> {
  const row = await db.setting.findUnique({ where: { key } });
  return row && typeof row.value === "object" && row.value !== null && !Array.isArray(row.value)
    ? (row.value as Record<string, unknown>)
    : {};
}

export async function getHomeContent(): Promise<HomeContent> {
  "use cache";
  cacheLife("max");
  cacheTag(CONTENT_TAG);
  return { ...DEFAULT_HOME, ...(await readSetting("home")) };
}

export async function getSiteInfo(): Promise<SiteInfo> {
  "use cache";
  cacheLife("max");
  cacheTag(CONTENT_TAG);
  return { ...DEFAULT_SITE, ...(await readSetting("site")) };
}

export async function getAbout(): Promise<AboutContent> {
  "use cache";
  cacheLife("max");
  cacheTag(CONTENT_TAG);
  return { ...DEFAULT_ABOUT, ...(await readSetting("about")) };
}
