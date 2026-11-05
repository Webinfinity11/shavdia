import type { Metadata, Viewport } from "next";
import { Noto_Sans_Georgian, Noto_Serif_Georgian } from "next/font/google";
import "./globals.css";

const sans = Noto_Sans_Georgian({ subsets: ["georgian", "latin"], variable: "--font-ka-sans" });
const serif = Noto_Serif_Georgian({ subsets: ["georgian", "latin"], variable: "--font-ka-serif" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3030"),
  title: { default: "SHAVDIA, დამზადებულია საქართველოში", template: "%s | SHAVDIA" },
  description: "SHAVDIA, დამზადებულია საქართველოში. აღმოაჩინე ჩვენი კოლექცია.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" data-scroll-behavior="smooth" className={`${sans.variable} ${serif.variable}`}>
      <body id="top">{children}</body>
    </html>
  );
}
