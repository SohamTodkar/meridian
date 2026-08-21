import type { MetadataRoute } from "next";
import { getAllIdeas } from "@/lib/ideas";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> { const ideas = await getAllIdeas(); return [{ url: "https://northstarhq-kuufgfpd.manus.space", lastModified: new Date() }, { url: "https://northstarhq-kuufgfpd.manus.space/ideas", lastModified: new Date() }, ...ideas.map((idea) => ({ url: `https://northstarhq-kuufgfpd.manus.space/ideas/${idea.slug}`, lastModified: new Date(`${idea.date}T12:00:00`) }))]; }
