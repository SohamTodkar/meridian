import type { Metadata } from "next";
import { Suspense } from "react";
import { IdeasExplorer } from "@/components/ideas/ideas-explorer";
import { getAllIdeas } from "@/lib/ideas";

export const metadata: Metadata = { title: "Ideas", description: "An archive of small experiments in systems, product, design, writing, and practice." };

export default async function IdeasPage() {
  const ideas = await getAllIdeas();
  return <Suspense fallback={<section className="ideas-explorer"><p className="eyebrow">Loading archive…</p></section>}><IdeasExplorer ideas={ideas} /></Suspense>;
}
