import { codeToHtml } from "shiki";
import { CopyCodeButton } from "./mdx-components";

export async function CodeBlock({ code, language }: { code: string; language: string }) {
  const html = await codeToHtml(code, { lang: language === "md" ? "markdown" : "typescript", theme: "github-dark" });
  return <div className="code-block"><CopyCodeButton code={code} /><div dangerouslySetInnerHTML={{ __html: html }} /></div>;
}
