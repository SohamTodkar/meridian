import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./observatory.css";
import "./observatory-interiors.css";
import "./focus.css";
import "./research.css";
import { AppShellLoader } from "@/components/app-shell-loader";
import { OfflineRuntime } from "@/components/offline-runtime";

const inter = localFont({
  src: "../fonts/Inter.var.woff2",
  variable: "--font-inter",
  display: "swap",
});

const jetBrains = localFont({
  src: "../fonts/JetBrainsMono.var.woff2",
  variable: "--font-mono",
  display: "swap",
});

const fraunces = localFont({
  src: [
    { path: "../fonts/Fraunces.var.woff2", style: "normal" },
    { path: "../fonts/Fraunces-italic.var.woff2", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Meridian — your study observatory",
    template: "%s · Meridian",
  },
  description:
    "A personal observatory for deep work. Follow your AI and machine learning path, study with intention, and keep your progress connected.",
  applicationName: "Meridian",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Meridian", statusBarStyle: "black" },
  icons: { icon: "/meridian-icon.svg", apple: "/meridian-icon.svg" },
  openGraph: {
    type: "website",
    siteName: "Meridian",
    title: "Meridian — your study observatory",
    description: "Your learning path. Your focus. One place to move forward.",
    url: siteUrl,
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0a0a0a" };

/** JSON-LD: the app is a WebApplication in a learning context. */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Meridian",
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web",
  description:
    "A personal study workspace with a guided learning map, focus sessions, evidence vault, spaced recall, and research tools.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  featureList: [
    "Guided learning sessions with proof-backed completion",
    "Evidence vault and portfolio",
    "Spaced retrieval practice",
    "Weekly review with private analytics",
    "Exa + Firecrawl deep web research",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrains.variable} ${fraunces.variable}`}
    >
      <body>
        <script
          type="application/ld+json"
          // Static, developer-authored structured data.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <AppShellLoader>{children}</AppShellLoader>
        <OfflineRuntime />
        <div id="modal-root" />
      </body>
    </html>
  );
}
