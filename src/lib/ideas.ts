import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";

const IDEAS_DIRECTORY = path.join(process.cwd(), "src", "content", "ideas");

export type IdeaStatus = "Exploring" | "Building" | "Published";

export type IdeaFrontmatter = {
  title: string;
  description: string;
  tags: string[];
  status: IdeaStatus;
  date: string;
  accent?: string;
  showcaseModel?: boolean;
};

export type IdeaSummary = IdeaFrontmatter & {
  slug: string;
  readingTime: string;
};

export type Idea = IdeaSummary & {
  content: string;
  headings: Array<{ id: string; text: string; level: 2 | 3 }>;
};

function headingId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function parseHeadings(source: string): Idea["headings"] {
  return source.split("\n").reduce<Idea["headings"]>((headings, line) => {
    const match = /^(#{2,3})\s+(.+)$/.exec(line);
    if (!match) return headings;
    const text = match[2]?.replace(/[`*_]/g, "") ?? "Section";
    headings.push({ level: match[1]?.length as 2 | 3, text, id: headingId(text) });
    return headings;
  }, []);
}

function fromMatter(slug: string, source: string): Idea {
  const parsed = matter(source);
  const frontmatter = parsed.data as IdeaFrontmatter;
  const rawContent = typeof parsed.content === "string" ? parsed.content : typeof source === "string" ? source.replace(/^---[\s\S]*?---\s*/, "") : "";
  const content = String(rawContent ?? "");
  const reading = readingTime(content);
  const rawDate = (parsed.data as { date: unknown }).date;
  const normalizedDate = rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate);

  return {
    ...frontmatter,
    date: normalizedDate,
    slug,
    content,
    readingTime: Math.max(1, Math.ceil(reading.minutes)) + " min read",
    headings: parseHeadings(content),
  };
}

export async function getAllIdeas(): Promise<IdeaSummary[]> {
  const files = (await readdir(IDEAS_DIRECTORY)).filter((file) => file.endsWith(".mdx"));
  const ideas = await Promise.all(files.map(async (file) => {
    const slug = file.replace(/\.mdx$/, "");
    const source = await readFile(path.join(IDEAS_DIRECTORY, file), "utf8");
    const idea = fromMatter(slug, source);
    return { slug: idea.slug, title: idea.title, description: idea.description, tags: idea.tags, status: idea.status, date: idea.date, accent: idea.accent, showcaseModel: idea.showcaseModel, readingTime: idea.readingTime };
  }));

  return ideas.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getIdeaBySlug(slug: string): Promise<Idea | null> {
  try {
    const source = await readFile(path.join(IDEAS_DIRECTORY, `${slug}.mdx`), "utf8");
    return fromMatter(slug, source);
  } catch {
    return null;
  }
}

export function toPlainText(source: string) {
  return source.replace(/<[^>]+>/g, "").replace(/[`*_#>]/g, "").replace(/\n{3,}/g, "\n\n").trim();
}
