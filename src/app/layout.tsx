import type { Metadata, Viewport } from "next";
import { Noto_Sans_Georgian, Noto_Serif_Georgian } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

// The brand fonts have no Georgian letters, so Georgian text falls through to Noto.
const arimo = localFont({ src: "./fonts/Arimo-Variable.woff2", weight: "400 700", variable: "--font-arimo" });
const gelasio = localFont({
  src: [
    { path: "./fonts/Gelasio-Variable.woff2", weight: "400 700", style: "normal" },
    { path: "./fonts/Gelasio-Italic-Variable.woff2", weight: "400 700", style: "italic" },
  ],
  variable: "--font-gelasio",
});
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
    <html lang="ka" data-scroll-behavior="smooth" className={`${arimo.variable} ${gelasio.variable} ${sans.variable} ${serif.variable}`}>
      <body id="top">{children}</body>
    </html>
  );
}
