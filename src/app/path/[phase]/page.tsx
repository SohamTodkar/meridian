import { PhaseHub } from "@/components/phase-hub";
import { model } from "@/data";

export function generateStaticParams() {
  return model.phases.map((phase) => ({ phase: phase.id }));
}

export const dynamicParams = false;

export default async function PhasePage({
  params,
}: {
  params: Promise<{ phase: string }>;
}) {
  const { phase } = await params;
  return <PhaseHub phaseId={phase} />;
}
