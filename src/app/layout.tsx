import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppShellLoader } from "@/components/app-shell-loader";
import { OfflineRuntime } from "@/components/offline-runtime";
import { SmoothScrollProvider } from "@/components/motion/smooth-scroll";
import { PageTransitionCurtain } from "@/components/motion/page-curtain";
import { EasterEggsAndHud } from "@/components/easter-eggs-and-hud";

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
    default: "Meridian — a local-first learning path",
    template: "%s · Meridian",
  },
  description:
    "Meridian is a local-first learning path: one useful action, an honest proof, and a record that stays on your device. Guided sessions, evidence vault, recall practice, and a research desk.",
  applicationName: "Meridian",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Meridian", statusBarStyle: "black" },
  icons: { icon: "/meridian-icon.svg", apple: "/meridian-icon.svg" },
  openGraph: {
    type: "website",
    siteName: "Meridian",
    title: "Meridian — a local-first learning path",
    description: "One useful action, an honest proof, and a record that stays on this device.",
    url: siteUrl,
  },
  robots: { index: process.env.NODE_ENV === "production", follow: true },
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
    "A local-first learning path: guided sessions, capability gates, evidence vault, spaced recall, and an Exa + Firecrawl research desk.",
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
    <html lang="en" className={`${inter.variable} ${jetBrains.variable} ${fraunces.variable}`}>
      <body>
        <script
          type="application/ld+json"
          // Static, developer-authored structured data.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <SmoothScrollProvider>
          <PageTransitionCurtain />
          <EasterEggsAndHud />
          <AppShellLoader>{children}</AppShellLoader>
          <OfflineRuntime />
          <div id="modal-root" />
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
