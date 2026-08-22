import type { Metadata } from "next";
import { ReviewView } from "@/components/stage3-views";

export const metadata: Metadata = {
  title: "Weekly review",
  description: "Look back honestly: measured time, private analytics, and three decisions for next week.",
};

export default function ReviewPage() {
  return <ReviewView />;
}
