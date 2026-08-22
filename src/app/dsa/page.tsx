import type { Metadata } from "next";
import { DsaView } from "@/components/stage3-views";

export const metadata: Metadata = {
  title: "DSA track",
  description: "The parallel fundamentals track: NeetCode milestones, patterns, and a thirty-minute allocation.",
};

export default function DsaPage() {
  return <DsaView />;
}
