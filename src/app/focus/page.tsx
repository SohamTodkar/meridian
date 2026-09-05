import type { Metadata } from "next";
import { FocusRoom } from "@/components/focus-room";
export const metadata: Metadata = {
  title: "Focus room",
  description: "One task. A quiet timer. Space to think.",
};
export default function Page() {
  return <FocusRoom />;
}
