import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import Link from "next/link";
import { ArticleReadingProgress } from "@/components/ideas/article-reading-progress";
import { ModelViewer } from "@/components/3d/model-viewer";
import { MdxArticle } from "@/components/ideas/mdx-article";
import { ShareButton } from "@/components/ideas/mdx-components";
import { getAllIdeas, getIdeaBySlug } from "@/lib/ideas";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() { return (await getAllIdeas()).map((idea) => ({ slug: idea.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const idea = await getIdeaBySlug((await params).slug);
  if (!idea) return {};
  return {
    title: idea.title,
    description: idea.description,
    openGraph: {
      title: idea.title,
      description: idea.description,
      type: "article",
      publishedTime: idea.date,
      images: [{ url: `/api/og?title=${encodeURIComponent(idea.title)}` }],
    },
  };
}

export default async function IdeaDetail({ params }: Props) {
  const idea = await getIdeaBySlug((await params).slug);
  if (!idea) notFound();
  const date = new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date(`${idea.date}T12:00:00`));
  const jsonLd = { "@context": "https://schema.org", "@type": "BlogPosting", headline: idea.title, description: idea.description, datePublished: idea.date, author: { "@type": "Person", name: "Ideas" }, mainEntityOfPage: `https://northstarhq-kuufgfpd.manus.space/ideas/${idea.slug}` };
  return <article className="idea-detail"><ArticleReadingProgress /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><header className="detail-hero"><Link className="back-link" href="/ideas"><ArrowLeft size={16} /> All ideas</Link><p className="eyebrow">{idea.status} / {idea.tags.join(" · ")}</p><h1>{idea.title}</h1><p className="detail-description">{idea.description}</p><div className="detail-meta"><span><CalendarDays size={14} /> {date}</span><span>{idea.readingTime}</span><ShareButton title={idea.title} /></div></header><div className="detail-layout"><aside className="detail-toc" aria-label="Table of contents"><strong>On this page</strong><ol>{idea.headings.map((heading) => <li className={`toc-level-${heading.level}`} key={heading.id}><a href={`#${heading.id}`}>{heading.text}</a></li>)}</ol></aside><div className="article-prose"><MdxArticle source={idea.content} />{idea.showcaseModel && <ModelViewer />}</div></div></article>;
}
