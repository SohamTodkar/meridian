import type { Metadata } from "next";
import { RecallView } from "@/components/stage3-views";

export const metadata: Metadata = {
  title: "Recall practice",
  description: "Answer before you look: private spaced-retrieval prompts grown from your own confusions.",
};

export default function RecallPage() {
  return <RecallView />;
}
