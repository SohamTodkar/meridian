import type { Metadata } from "next";
import { DailyRhythm } from "@/components/daily-rhythm";

export const metadata: Metadata = {
  title: "Daily rhythm",
  description:
    "The protocol in pieces: pace doctrine, streak recovery, the stuck protocol, and the writing ritual.",
};

export default function RhythmPage() {
  return <DailyRhythm />;
}
