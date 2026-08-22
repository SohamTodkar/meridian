import type { Metadata } from "next";
import { FirstSevenDaysView } from "@/components/stage3-views";

export const metadata: Metadata = {
  title: "First 7 days",
  description: "A guided, checkable on-ramp: seven days that set the learning rhythm.",
};

export default function FirstSevenDaysPage() {
  return <FirstSevenDaysView />;
}
