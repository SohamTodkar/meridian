import type { Metadata } from "next";
import { SafetyNetView } from "@/components/stage3-views";

export const metadata: Metadata = {
  title: "Safety net",
  description: "CS fundamentals and career floor — kept beneath the learning path.",
};

export default function SafetyNetPage() {
  return <SafetyNetView />;
}
