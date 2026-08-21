import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkGfm from "remark-gfm";
import { KineticText } from "@/components/ui/kinetic-text";
import { CodeBlock } from "./code-block";
import { Callout } from "./mdx-components";
import { ImageWithCaption } from "./image-with-caption";

type Node = { type: string; name?: string; value?: string; depth?: number; url?: string; title?: string | null; alt?: string | null; checked?: boolean | null; children?: Node[]; attributes?: Array<{ name?: string; value?: string | { value?: string } | null }> };

function headingId(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

function attribute(node: Node, name: string) {
  const value = node.attributes?.find((item) => item.name === name)?.value;
  if (typeof value === "string") return value;
  return value?.value?.replace(/^`|`$/g, "") ?? "";
}

async function inline(nodes: Node[] = [], keyPrefix: string): Promise<React.ReactNode[]> {
  return Promise.all(nodes.map(async (node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.type === "text" || node.type === "inlineCode" || node.type === "mdxTextExpression") return node.value ?? "";
    if (node.type === "strong") return <strong key={key}>{await inline(node.children, key)}</strong>;
    if (node.type === "emphasis") return <em key={key}>{await inline(node.children, key)}</em>;
    if (node.type === "delete") return <del key={key}>{await inline(node.children, key)}</del>;
    if (node.type === "break") return <br key={key} />;
    if (node.type === "link") return <a key={key} href={node.url}>{await inline(node.children, key)}</a>;
    return node.value ?? await inline(node.children, key);
  }));
}

async function blocks(nodes: Node[] = [], keyPrefix: string): Promise<React.ReactNode[]> {
  return Promise.all(nodes.map(async (node, index) => {
    const key = `${keyPrefix}-${index}`;
    const children = node.children ?? [];
    if (node.type === "heading") {
      const text = (await inline(children, key)).join("");
      const id = headingId(text);
      if (node.depth === 2) return <h2 id={id} className="mdx-heading" key={key}><a href={`#${id}`} aria-label={`Link to ${text}`}>#</a><KineticText>{text}</KineticText></h2>;
      if (node.depth === 3) return <h3 id={id} className="mdx-heading" key={key}><a href={`#${id}`} aria-label={`Link to ${text}`}>#</a><KineticText>{text}</KineticText></h3>;
      return <h4 key={key}>{text}</h4>;
    }
    if (node.type === "paragraph") return <p key={key}>{await inline(children, key)}</p>;
    if (node.type === "blockquote") return <blockquote key={key}>{await blocks(children, key)}</blockquote>;
    if (node.type === "list") {
      const entries = await Promise.all(children.map(async (item, itemIndex) => <li key={`${key}-${itemIndex}`}>{await blocks(item.children, `${key}-${itemIndex}`)}</li>));
      return node.checked === null ? <ol key={key}>{entries}</ol> : <ul key={key}>{entries}</ul>;
    }
    if (node.type === "code") return <CodeBlock key={key} language={node.title ?? "text"} code={node.value ?? ""} />;
    if (node.type === "table") {
      const rows = await Promise.all(children.map(async (row, rowIndex) => <tr key={`${key}-${rowIndex}`}>{await Promise.all((row.children ?? []).map(async (cell, cellIndex) => rowIndex === 0 ? <th key={`${key}-${rowIndex}-${cellIndex}`}>{await inline(cell.children, `${key}-${rowIndex}-${cellIndex}`)}</th> : <td key={`${key}-${rowIndex}-${cellIndex}`}>{await inline(cell.children, `${key}-${rowIndex}-${cellIndex}`)}</td>))}</tr>));
      return <table key={key}><thead>{rows[0]}</thead><tbody>{rows.slice(1)}</tbody></table>;
    }
    if (node.type === "mdxJsxFlowElement") {
      const component = node.name;
      if (component === "Callout") return <Callout key={key} title={attribute(node, "title")}>{await inline(children, key)}</Callout>;
      if (component === "CodeBlock") return <CodeBlock key={key} language={attribute(node, "language") || "text"} code={attribute(node, "code")} />;
      if (component === "ImageWithCaption") return <ImageWithCaption key={key} src={attribute(node, "src")} alt={attribute(node, "alt")} caption={attribute(node, "caption")} />;
    }
    if (node.type === "thematicBreak") return <hr key={key} />;
    return null;
  }));
}

export async function MdxArticle({ source }: { source: string }) {
  const processor = unified().use(remarkParse).use(remarkMdx).use(remarkGfm);
  const tree = await processor.run(processor.parse(source)) as unknown as { children: Node[] };
  return <>{await blocks(tree.children, "article")}</>;
}
