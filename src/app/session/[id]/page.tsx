import { SessionRunner } from "@/components/session-runner";
import { model } from "@/data";

export function generateStaticParams() {
  return model.phases.flatMap((phase) => phase.sessions.map((session) => ({ id: session.id })));
}

export const dynamicParams = false;

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionRunner sessionId={id} />;
}
