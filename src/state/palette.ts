import type { MeridianModel } from "@/data";
import type { MeridianStateSnapshot } from "./selectors";

export interface PaletteResult {
  id: string;
  label: string;
  group: string;
  href: string;
  score: number;
}

function scoreMatch(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  const value = text.toLowerCase();
  if (!q) return 0;
  if (value === q) return 1000;
  if (value.startsWith(q)) return 800 - value.length;
  if (value.includes(q)) return 600 - value.indexOf(q);
  let cursor = 0;
  let hits = 0;
  for (const char of q) {
    const index = value.indexOf(char, cursor);
    if (index < 0) return -1;
    hits += 1;
    cursor = index + 1;
  }
  return 300 + hits * 4 - value.length;
}

export function buildPaletteIndex(model: MeridianModel, state?: Partial<MeridianStateSnapshot>): PaletteResult[] {
  const nextSession = model.phases.flatMap((phase) => phase.sessions).find((session) => !state?.sessions?.[session.id]?.completed);
  const resumeAttempt = Object.values(state?.sessionAttempts ?? {}).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const results: PaletteResult[] = [
    { id: "next", label: "Jump to my next action", group: "Command", href: "/", score: 0 },
    { id: "recall-now", label: "Practice due recall prompts", group: "Action", href: "/recall", score: 0 },
    { id: "capture-evidence", label: "Create a new evidence record", group: "Action", href: "/portfolio#capture", score: 0 },
    { id: "backup", label: "Back up my local learning data", group: "Action", href: "/settings#portable-state", score: 0 },
    ...(nextSession ? [{ id: "start-next", label: `Start next session: ${nextSession.title}`, group: "Action", href: `/session/${nextSession.id}`, score: 0 }] : []),
    ...(resumeAttempt ? [{ id: "resume", label: "Resume saved session attempt", group: "Action", href: `/session/${resumeAttempt.sessionId}`, score: 0 }] : []),
    ...[
      ["/", "Today"], ["/path", "Learning path"], ["/rhythm", "Daily rhythm"], ["/dsa", "DSA track"], ["/recall", "Recall practice"],
      ["/journal", "Journal"], ["/review", "Weekly review"], ["/portfolio", "Portfolio"],
      ["/library", "Library & network"], ["/first-seven-days", "First 7 days"], ["/safety-net", "Safety net"], ["/settings", "Settings"],
    ].map(([href, label]) => ({ id: `route:${href}`, label, group: "Routes", href, score: 0 })),
  ];
  for (const phase of model.phases) {
    for (const session of phase.sessions) {
      results.push({ id: session.id, label: session.title, group: "Sessions", href: `/session/${session.id}`, score: 0 });
    }
    for (const section of phase.curriculum) {
      section.items.forEach((item, index) => {
        const text = typeof item === "string" ? item : "text" in item ? item.text : "name" in item ? item.name : `${section.title} ${index + 1}`;
        results.push({ id: `${section.key}.${index + 1}`, label: text, group: "Curriculum", href: `/path/${phase.identity.number}?tab=curriculum`, score: 0 });
      });
    }
    for (const resource of phase.resources) {
      results.push({ id: resource.id, label: resource.name, group: "Resources", href: `/path/${phase.identity.number}?tab=resources`, score: 0 });
    }
  }
  for (const group of model.library.communities) for (const item of group.items) results.push({ id: item.key, label: item.name, group: "Library", href: "/library?tab=communities", score: 0 });
  for (const [group, people] of Object.entries(model.library.people)) for (const [index, item] of people.entries()) results.push({ id: `person:${group}:${index}:${item.name}`, label: item.name, group: "Library", href: "/library?tab=people", score: 0 });
  for (const [index, item] of model.library.tools.entries()) results.push({ id: `${item.key}:${index}`, label: item.name, group: "Library", href: "/library?tab=tools", score: 0 });
  return results;
}

export function searchPalette(index: PaletteResult[], query: string): PaletteResult[] {
  return index
    .map((item) => ({ ...item, score: scoreMatch(query, `${item.label} ${item.group}`) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, 24);
}
