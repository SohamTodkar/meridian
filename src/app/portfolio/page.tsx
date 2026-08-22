import type { Metadata } from "next";
import { PortfolioView } from "@/components/stage3-views";

export const metadata: Metadata = {
  title: "Portfolio · evidence vault",
  description: "Verified session proofs, artifacts, notes and links — proof attached to the learning.",
};

export default function PortfolioPage() {
  return <PortfolioView />;
}
