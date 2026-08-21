import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { LenisProvider } from "@/components/layout/lenis-provider";
import { PageTransition } from "@/components/layout/page-transition";
import { RuntimePolish } from "@/components/layout/runtime-polish";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ScrollProgress } from "@/components/shared/scroll-progress";

const geist = localFont({ src: "../fonts/Inter.var.woff2", variable: "--font-geist", display: "swap" });
const mono = localFont({ src: "../fonts/JetBrainsMono.var.woff2", variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://northstarhq-kuufgfpd.manus.space"),
  title: { default: "Ideas — field notes for useful unfinished thinking", template: "%s — Ideas" },
  description: "A personal field journal for systems, interfaces, practice, and small experiments.",
  manifest: "/manifest.webmanifest",
  alternates: { types: { "application/rss+xml": "/api/rss" } },
  icons: { icon: "/ideas-icon.svg", apple: "/ideas-icon.svg" },
  openGraph: { type: "website", title: "Ideas", description: "Field notes for useful unfinished thinking." },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#101112", colorScheme: "dark light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="dark" className={`${geist.variable} ${mono.variable}`}><body><LenisProvider><a className="skip-link" href="#main-content">Skip to content</a><ScrollProgress /><PageTransition /><RuntimePolish /><SiteHeader /><main id="main-content" tabIndex={-1}>{children}</main><SiteFooter /></LenisProvider></body></html>;
}
