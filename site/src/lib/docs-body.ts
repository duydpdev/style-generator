import { TOC_TITLES } from "./locale";

/** `(#table-of-contents)` / `(#mục-lục)`: TOC entries that point at the TOC itself. */
const TOC_SELF_LINKS = TOC_TITLES.map((t) => `(#${t.replace(/ /g, "-")})`);

/** A `## Table of contents` / `## Mục lục` line. */
function isTocHeading(line: string): boolean {
  const t = line.trim();
  return (
    t.startsWith("## ") && TOC_TITLES.includes(t.slice(3).trim().toLowerCase())
  );
}

const LIST_ITEM = /^[-*+] /;

/** Reading time shown in the page header (about 220 words per minute). */
export function approxReadMinutes(source: string): number {
  const words = source.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

/**
 * Cleans a hand-written "Table of contents" list: drops the wrapper entry that
 * points at the page title (its heading is not rendered, so the link is dead
 * and it only adds a nesting level) and the entry that points at the TOC itself.
 */
function tidyToc(markdown: string): string {
  const lines = markdown.split("\n");
  const heading = lines.findIndex((l) => isTocHeading(l));
  if (heading < 0) return markdown;
  const first = lines.findIndex((l, i) => i > heading && l.trim() !== "");
  if (first < 0 || !/^\s*([-*+]|\d+\.) /.test(lines[first])) return markdown;

  let end = first;
  while (end < lines.length && lines[end].trim() !== "") end += 1;

  let list = lines.slice(first, end);
  const [root, ...children] = list;
  if (
    LIST_ITEM.test(root) &&
    children.length > 0 &&
    children.every((l) => l.startsWith(" "))
  ) {
    list = children.map((l) => l.replace(/^ {1,2}/, ""));
  }
  list = list.filter((l) => !TOC_SELF_LINKS.some((s) => l.includes(s)));

  return [...lines.slice(0, first), ...list, ...lines.slice(end)].join("\n");
}

/**
 * The markdown a doc page renders: the page header already shows the title as
 * an `<h1>`, so the file's own first-line `# title` is dropped.
 */
export function docBody(source: string): string {
  const lines = source.split("\n");
  const titleAt = lines.findIndex((l) => l.trim() !== "");
  return tidyToc(
    titleAt >= 0 && lines[titleAt].startsWith("# ")
      ? lines.slice(titleAt + 1).join("\n")
      : source,
  );
}
