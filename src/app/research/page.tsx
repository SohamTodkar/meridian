import type { Metadata } from "next";
import { ResearchView } from "@/components/research/research-view";

export const metadata: Metadata = {
  title: "Research desk",
  description:
    "Deep web research with Exa neural search and Firecrawl extraction — ask a question, get the ten most relevant sources with clean extracted text.",
};

export default function ResearchPage() {
  return <ResearchView />;
}
