import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/" }, sitemap: "https://northstarhq-kuufgfpd.manus.space/sitemap.xml" }; }
