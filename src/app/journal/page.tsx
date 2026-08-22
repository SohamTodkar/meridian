import type { Metadata } from "next";
import { JournalView } from "@/components/stage3-views";

export const metadata: Metadata = {
  title: "Journal",
  description: "Session completions, daily logs and reflections — the honest record, newest first.",
};

export default function JournalPage() {
  return <JournalView />;
}
