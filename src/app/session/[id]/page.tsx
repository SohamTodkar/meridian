import type { Metadata } from "next";
import { SessionRunner } from "@/components/session-runner";
import { model } from "@/data";

export function generateStaticParams() {
  return model.phases.flatMap((phase) => phase.sessions.map((session) => ({ id: session.id })));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = model.phases.flatMap((phase) => phase.sessions).find((item) => item.id === id);
  if (!session) return { title: "Session" };
  return {
    title: session.title,
    description: session.outcome,
    openGraph: {
      title: session.title,
      description: session.outcome,
    },
  };
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionRunner sessionId={id} />;
}
