import type { Metadata } from "next";
import { PathView } from "@/components/path-view";

export const metadata: Metadata = {
  title: "Learning path",
  description: "Four phases, sixty-five guided sessions, capability gates — a path, not a pile.",
};

export default function PathPage() {
  return <PathView />;
}
