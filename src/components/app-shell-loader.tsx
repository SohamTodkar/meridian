"use client";

import dynamic from "next/dynamic";

const AppShell = dynamic(() => import("./app-shell").then((module) => module.AppShell), {
  ssr: false,
  loading: () => <div className="empty-state" style={{ margin: 24 }}>Opening Meridian.</div>,
});

export function AppShellLoader({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
