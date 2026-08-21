"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import type { IdeaSummary } from "@/lib/ideas";

export function IdeaCard({ idea }: { idea: IdeaSummary }) {
  const formattedDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${idea.date}T12:00:00`));
  return <motion.article layout className={`idea-card accent-${idea.accent ?? "coral"}`}><Link href={`/ideas/${idea.slug}`} className="idea-card-link" aria-label={`Read ${idea.title}`}><div className="idea-card-reveal" aria-hidden="true"><span /></div><div className="idea-card-meta"><span>{idea.status}</span><span>{idea.readingTime}</span></div><h2>{idea.title}</h2><p>{idea.description}</p><div className="idea-card-bottom"><ul aria-label="Tags">{idea.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul><ArrowUpRight size={18} /></div><time dateTime={idea.date}>{formattedDate}</time></Link></motion.article>;
}
