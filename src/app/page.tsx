import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { HeroLoader } from "@/components/3d/hero-loader";
import { KineticText } from "@/components/ui/kinetic-text";
import { getAllIdeas } from "@/lib/ideas";

export default async function Home() {
  const ideas = await getAllIdeas();
  const latest = ideas.slice(0, 3);
  return <><section className="hero"><div className="hero-copy"><p className="eyebrow">Independent field journal / Est. 2026</p><KineticText as="h1">Useful unfinished thinking.</KineticText><p className="hero-intro">A deliberately small home for notes on systems, interfaces, practice, and the work of staying curious.</p><div className="hero-actions"><Link href="/ideas" className="button-primary">Enter the archive <ArrowUpRight size={17} /></Link><a href="#latest" className="text-link">Scroll for latest <ArrowDownRight size={16} /></a></div></div><div className="hero-visual"><HeroLoader /><p className="hero-annotation"><span>01 / Signal object</span><span>Pointer-reactive study</span></p></div></section><section id="latest" className="latest-ideas"><div className="section-intro"><div><p className="eyebrow">Latest signals</p><h2>Notes with a next move.</h2></div><Link className="text-link" href="/ideas">View all ideas <ArrowUpRight size={16} /></Link></div><div className="latest-list">{latest.map((idea, index) => <article key={idea.slug} className="latest-item"><span className="latest-index">0{index + 1}</span><Link href={`/ideas/${idea.slug}`}><h3>{idea.title}</h3><p>{idea.description}</p></Link><span className="latest-meta">{idea.status} / {idea.readingTime}</span><ArrowUpRight aria-hidden="true" size={18} /></article>)}</div></section><section className="manifesto"><p className="eyebrow">Working principle</p><p>Ideas are better when they leave a trace: a decision, a sketch, a test, or one sharper question.</p><Link className="button-secondary" href="/ideas/the-case-for-personal-radar">Read the personal radar <ArrowUpRight size={16} /></Link></section></>;
}
