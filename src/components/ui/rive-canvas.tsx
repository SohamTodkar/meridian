"use client";

import { useRive } from "@rive-app/react-canvas";
import { useIdeasUi } from "@/state/ideas-ui";

function RiveAsset({ src, label }: { src: string; label: string }) {
  const { RiveComponent, rive } = useRive({ src, autoplay: true });
  const progress = useIdeasUi((state) => state.scrollProgress);
  if (rive) rive.setNumberStateAtPath?.("scrollProgress", progress, "State Machine 1");
  return <div className="rive-asset" aria-label={label}><RiveComponent /></div>;
}

export function RiveCanvas({ label = "Decorative animated vector detail" }: { label?: string }) {
  return <RiveAsset src="/manus-storage/ideas-signal_961639a9.riv" label={label} />;
}
