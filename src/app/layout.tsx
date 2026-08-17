import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppShellLoader } from "@/components/app-shell-loader";
import { OfflineRuntime } from "@/components/offline-runtime";
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider";
import { PageTransitionCurtain } from "@/components/page-transition-curtain";
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

export const metadata: Metadata = {
  title: "Meridian — learning path",
  description: "A local-first learning path for Soham.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Meridian", statusBarStyle: "black" },
  icons: { icon: "/meridian-icon.svg", apple: "/meridian-icon.svg" },
};

export const viewport: Viewport = { themeColor: "#0a0a0a" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetBrains.variable}`}>
      <body>
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
