import { getAllIdeas } from "@/lib/ideas";

export async function GET() {
  const ideas = await getAllIdeas();
  const items = ideas.map((idea) => `<item><title><![CDATA[${idea.title}]]></title><link>https://northstarhq-kuufgfpd.manus.space/ideas/${idea.slug}</link><guid>ideas-${idea.slug}</guid><description><![CDATA[${idea.description}]]></description><pubDate>${new Date(`${idea.date}T12:00:00`).toUTCString()}</pubDate></item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Ideas</title><link>https://northstarhq-kuufgfpd.manus.space</link><description>Field notes for useful unfinished thinking.</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
