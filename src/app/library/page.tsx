import type { Metadata } from "next";
import { LibraryView } from "@/components/stage3-views";

export const metadata: Metadata = {
  title: "Library & network",
  description: "A phase-first resource map: tiered resources, communities, tools, and books with a unified fuzzy-search explorer.",
};

export default function LibraryPage() {
  return <LibraryView />;
}
