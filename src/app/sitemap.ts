import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Static route inventory — every Meridian surface. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<[path: string, priority: number]> = [
    ["/", 1],
    ["/path", 0.9],
    ["/library", 0.8],
    ["/research", 0.8],
    ["/recall", 0.7],
    ["/review", 0.7],
    ["/journal", 0.6],
    ["/portfolio", 0.6],
    ["/rhythm", 0.6],
    ["/dsa", 0.6],
    ["/first-seven-days", 0.5],
    ["/safety-net", 0.5],
    ["/settings", 0.3],
  ];
  return routes.map(([path, priority]) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority,
  }));
}
