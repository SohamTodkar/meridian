import type { Metadata } from "next";
import { TodayView } from "@/components/today-view";

export const metadata: Metadata = {
  title: "Today — one useful action",
  description: "Your next guided session, an honest daily plan, and the rhythm that keeps the record alive.",
};

export default function Home() {
  return <TodayView />;
}
