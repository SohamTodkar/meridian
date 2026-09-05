import type { Phase } from "@/data";
export function checkpointEvidence(
  phase: Phase
): Array<{ id: string; ids: string[]; text: string }> {
  const raw = [
    ...phase.checkpoint.cockpit.requirements.map((text, index) => ({
      id: `${phase.id}.checkpoint.requirement.${index + 1}`,
      text,
    })),
    ...phase.checkpoint.northstar.map((text, index) => ({
      id: `${phase.id}.gate.${index + 1}`,
      text,
    })),
  ];
  const selected: Array<{ id: string; ids: string[]; text: string }> = [];
  for (const item of raw) {
    const normalized = item.text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    const duplicate = selected.find(existing => {
      const existingNormalized = existing.text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
      return (
        existingNormalized === normalized ||
        existingNormalized.includes(normalized) ||
        normalized.includes(existingNormalized)
      );
    });
    if (!duplicate) selected.push({ ...item, ids: [item.id] });
    else {
      duplicate.ids.push(item.id);
      if (item.text.length > duplicate.text.length) duplicate.text = item.text;
    }
  }
  return selected;
}
