"use client";

import { Check, Copy, Link as LinkIcon, Share2 } from "lucide-react";
import { useState } from "react";
import { KineticText } from "@/components/ui/kinetic-text";

function headingId(children: React.ReactNode) { return String(children).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

function Heading({ children, level }: { children: React.ReactNode; level: "h2" | "h3" }) {
  const id = headingId(children);
  const Tag = level;
  return <Tag id={id} className="mdx-heading"><a href={`#${id}`} aria-label={`Link to ${String(children)}`}><LinkIcon size={15} /></a><KineticText>{String(children)}</KineticText></Tag>;
}

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }
  return <button className="copy-code" onClick={copy} type="button" aria-label="Copy code">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy"}</button>;
}

export function Callout({ title, children }: { title: string; children: React.ReactNode }) { return <aside className="mdx-callout"><strong>{title}</strong><div>{children}</div></aside>; }

export function ShareButton({ title }: { title: string }) {
  async function share() { if (navigator.share) await navigator.share({ title, url: window.location.href }); else await navigator.clipboard.writeText(window.location.href); }
  return <button className="share-button" type="button" onClick={share}><Share2 size={15} /> Share</button>;
}

export const mdxComponents = { h2: (props: { children: React.ReactNode }) => <Heading level="h2" {...props} />, h3: (props: { children: React.ReactNode }) => <Heading level="h3" {...props} />, Callout, CodeBlock: () => null };
