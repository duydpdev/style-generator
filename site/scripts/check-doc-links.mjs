#!/usr/bin/env node
/**
 * Link check for the markdown files the landing site renders (the globs in
 * `src/lib/docs-content.ts`, including `documents/getting-started` and
 * `documents/reference`): every relative link must point at an existing
 * file, and a `#anchor` into a markdown file must match one of its headings
 * (GitHub slug rules). Absolute URLs are not fetched. Exits 1 on any miss.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// Keep in sync with the `import.meta.glob` patterns in `src/lib/docs-content.ts`.
const markdownIn = (dir) =>
  readdirSync(resolve(repoRoot, dir))
    .filter((name) => name.endsWith(".md") && name !== "README.md")
    .map((name) => `${dir}/${name}`);

const DOC_FILES = [
  "README.md",
  "documents/migration/4.x-to-5.0.md",
  "documents/migration/3.x-to-4.0.md",
  ...markdownIn("documents"),
  ...markdownIn("documents/getting-started"),
  ...markdownIn("documents/reference"),
];

// `src/lib/docs-meta.json` must describe exactly the rendered files, with unique slugs and orders.
const META_GROUPS = [
  "Start",
  "Guides",
  "Reference",
  "Overview",
  "Operations",
  "Migration",
];
const meta = JSON.parse(
  readFileSync(resolve(repoRoot, "site/src/lib/docs-meta.json"), "utf8"),
);
/** @type {string[]} */
const metaErrors = [];
for (const file of DOC_FILES) {
  if (!(file in meta)) metaErrors.push(`docs-meta.json: no entry for ${file}`);
}
const seenSlugs = new Set();
const seenOrders = new Set();
for (const [key, entry] of Object.entries(meta)) {
  if (!DOC_FILES.includes(key)) {
    metaErrors.push(`docs-meta.json: ${key} is not a rendered doc`);
  }
  if (seenSlugs.has(entry.slug)) {
    metaErrors.push(`docs-meta.json: duplicate slug ${entry.slug}`);
  }
  seenSlugs.add(entry.slug);
  const order = `${entry.group}/${String(entry.order)}`;
  if (seenOrders.has(order)) {
    metaErrors.push(`docs-meta.json: duplicate order ${order}`);
  }
  seenOrders.add(order);
  if (!META_GROUPS.includes(entry.group)) {
    metaErrors.push(`docs-meta.json: unknown group ${entry.group} in ${key}`);
  }
}
if (metaErrors.length > 0) {
  for (const line of metaErrors) console.error(line);
  process.exit(1);
}

/**
 * Blank out fenced blocks (and, with `inline`, inline code spans) with
 * same-length spaces, newlines kept, so their contents are neither links nor
 * headings.
 * @param {string} md - Raw markdown
 * @param {boolean} inline - Also blank inline code spans
 * @returns {string} Masked markdown with identical offsets and line numbers
 */
function maskCode(md, inline) {
  let inFence = null;
  const lines = md.split("\n").map((line) => {
    const fence = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (inFence) {
      if (fence && fence[0] === inFence[0] && fence.length >= inFence.length) {
        inFence = null;
      }
      return " ".repeat(line.length);
    }
    if (fence) {
      inFence = fence;
      return " ".repeat(line.length);
    }
    if (!inline) return line;
    // eslint-disable-next-line sonarjs/slow-regex -- runs on this repo's own markdown, never on untrusted input
    return line.replace(/(`+)[^`]+?\1/g, (span) => " ".repeat(span.length));
  });
  return lines.join("\n");
}

/**
 * GitHub-style anchor for heading text (before duplicate numbering).
 * @param {string} text - Heading source text
 * @returns {string} Slug
 */
function slugify(text) {
  return (
    text
      // eslint-disable-next-line sonarjs/slow-regex -- runs on this repo's own markdown, never on untrusted input
      .replace(/<[^>]+>/g, "")
      // eslint-disable-next-line sonarjs/slow-regex -- runs on this repo's own markdown, never on untrusted input
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[`*~]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, "")
      .replace(/ /g, "-")
  );
}

/**
 * All anchors a markdown file exposes: heading slugs (with GitHub's `-1`,
 * `-2` suffix for repeats) and explicit `id`/`name` attributes.
 * @param {string} md - Raw markdown
 * @returns {Set<string>} Anchor ids
 */
function collectAnchors(md) {
  const anchors = new Set();
  const seen = new Map();
  for (const line of maskCode(md, false).split("\n")) {
    // eslint-disable-next-line sonarjs/slow-regex -- runs on this repo's own markdown, never on untrusted input
    const heading = /^ {0,3}#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/.exec(line);
    if (!heading) continue;
    const base = slugify(heading[1]);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${String(count)}`);
  }
  for (const m of md.matchAll(/\b(?:id|name)="([^"]+)"/g)) anchors.add(m[1]);
  return anchors;
}

/**
 * Link destinations of inline `[text](dest)` / `![alt](dest)` links and
 * reference definitions `[label]: dest`.
 * @param {string} md - Raw markdown
 * @returns {{ href: string, line: number }[]} Destinations with 1-based line
 */
function collectLinks(md) {
  const masked = maskCode(md, true);
  const found = [];
  const patterns = [
    /\]\(\s*(<[^>\n]*>|[^\s)]+)/g,
    /^ {0,3}\[[^\]\n]+\]:[ \t]+(<[^>\n]*>|\S+)/gm,
  ];
  for (const pattern of patterns) {
    for (const m of masked.matchAll(pattern)) {
      const href = m[1].replace(/^<|>$/g, "");
      const line = masked.slice(0, m.index).split("\n").length;
      found.push({ href, line });
    }
  }
  return found;
}

const sources = new Map(
  DOC_FILES.map((file) => [
    file,
    readFileSync(resolve(repoRoot, file), "utf8"),
  ]),
);
/** @type {Map<string, Set<string>>} */
const anchorCache = new Map();

/**
 * @param {string} file - Repo-relative markdown path in the site set
 * @returns {Set<string>} Its anchors
 */
function anchorsOf(file) {
  let anchors = anchorCache.get(file);
  if (!anchors) {
    anchors = collectAnchors(sources.get(file) ?? "");
    anchorCache.set(file, anchors);
  }
  return anchors;
}

/**
 * @param {string} value - Possibly percent-encoded path or fragment
 * @returns {string} Decoded value, or the input if it is malformed
 */
function decode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** @type {string[]} */
const broken = [];

for (const [file, md] of sources) {
  for (const { href, line } of collectLinks(md)) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) continue;

    const hashAt = href.indexOf("#");
    const withoutHash = hashAt < 0 ? href : href.slice(0, hashAt);
    const anchor = hashAt < 0 ? "" : decode(href.slice(hashAt + 1));
    const queryAt = withoutHash.indexOf("?");
    const pathPart = decode(
      queryAt < 0 ? withoutHash : withoutHash.slice(0, queryAt),
    );
    const where = `${file}:${String(line)}  (${href})`;

    /** Repo-relative path of the target (the file itself for `#anchor`). */
    let target = file;
    if (pathPart) {
      const absolute = pathPart.startsWith("/")
        ? resolve(repoRoot, `.${pathPart}`)
        : resolve(repoRoot, dirname(file), pathPart);
      target = relative(repoRoot, absolute).split(sep).join("/");
      if (target.startsWith("..")) {
        broken.push(`${where} → outside the repository`);
        continue;
      }
      if (!existsSync(absolute)) {
        broken.push(`${where} → ${target} does not exist`);
        continue;
      }
    }

    if (anchor && sources.has(target) && !anchorsOf(target).has(anchor)) {
      broken.push(`${where} → no heading "#${anchor}" in ${target}`);
    }
  }
}

if (broken.length > 0) {
  console.error(`check-doc-links: ${String(broken.length)} broken link(s):`);
  for (const entry of broken) console.error(`  ${entry}`);
  process.exit(1);
}
console.log(
  `check-doc-links: ${String(sources.size)} files, all relative links resolve`,
);
