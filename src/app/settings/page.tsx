import type { Metadata } from "next";
import { SettingsView } from "@/components/settings-view";

export const metadata: Metadata = {
  title: "Settings",
  description: "Schedule guides, pace overrides, and portable local state — export, preview, and restore your Meridian data.",
};

export default function SettingsPage() {
  return <SettingsView />;
}
