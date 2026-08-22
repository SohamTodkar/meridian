import type { Metadata } from "next";
import { PhaseHub } from "@/components/phase-hub";
import { model } from "@/data";

export function generateStaticParams() {
  return model.phases.map((phase) => ({ phase: phase.id }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ phase: string }>;
}): Promise<Metadata> {
  const { phase: phaseId } = await params;
  const canonicalId = /^p\d$/.test(phaseId) ? phaseId : `p${phaseId}`;
  const phase = model.phases.find((item) => item.id === canonicalId);
  if (!phase) return { title: "Phase" };
  return {
    title: `Phase ${phase.identity.number + 1} · ${phase.identity.northstarName}`,
    description: phase.identity.promise,
    openGraph: {
      title: `Phase ${phase.identity.number + 1} · ${phase.identity.northstarName}`,
      description: phase.identity.promise,
    },
  };
}

export default async function PhasePage({
  params,
}: {
  params: Promise<{ phase: string }>;
}) {
  const { phase } = await params;
  return <PhaseHub phaseId={phase} />;
}
