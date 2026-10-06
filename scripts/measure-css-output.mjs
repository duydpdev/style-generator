#!/usr/bin/env node
/**
 * Measure a compiled CSS artifact (file or directory of *.css): raw bytes,
 * gzip bytes, class-selector count, and a per-source breakdown.
 *
 * Usage:
 *   node scripts/measure-css-output.mjs <file|dir> [--classes-out <file>] [--json]
 *
 * Breakdown groups (heuristic, each top-level/layer-level rule lands in exactly one):
 *   font       `@font-face`
 *   preflight  `@layer base`, top-level html/body/* resets
 *   themeVars  `@layer theme`, rules declaring --sg-* / --color-* (:root, [data-*])
 *   spacing    rules whose selector contains `.sp-` or that declare --tw-sp-* / --sp-* / --sg-sp-*
 *   utilities  remaining `@layer utilities` rules
 *   other      `@property`, `@layer properties`, anything unmatched
 * Group gzip sizes are measured per group, so they do not add up to the total gzip.
 */
import { readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
const classesOutIdx = args.indexOf("--classes-out");
const classesOut = classesOutIdx >= 0 ? args[classesOutIdx + 1] : undefined;
const asJson = args.includes("--json");

if (!target) {
  console.error(
    "Usage: measure-css-output.mjs <file|dir> [--classes-out <file>] [--json]",
  );
  process.exit(2);
}

/**
 * The CSS files to measure.
 * @param {string} path - A `.css` file, or a directory whose `*.css` files are read
 * @returns {string[]} Absolute file paths, sorted by name for a directory
 */
function collectCssFiles(path) {
  const abs = resolve(path);
  if (statSync(abs).isDirectory()) {
    return readdirSync(abs)
      .filter((f) => f.endsWith(".css"))
      .sort()
      .map((f) => join(abs, f));
  }
  return [abs];
}

/**
 * Index just past the comment or quoted string that starts at `i`.
 * @param {string} css - CSS text
 * @param {number} i - Index of `/*` or of an opening quote
 * @returns {number} Index of the first character after it
 */
function skipToken(css, i) {
  if (css[i] === "/") {
    const end = css.indexOf("*/", i + 2);
    return end < 0 ? css.length : end + 2;
  }
  const quote = css[i];
  let j = i + 1;
  while (j < css.length && css[j] !== quote) j += css[j] === "\\" ? 2 : 1;
  return j + 1;
}

/**
 * Split CSS text into top-level blocks (`body` is undefined for `@x ...;`).
 * @param {string} css - CSS text
 * @returns {{ prelude: string, body: string | undefined, text: string }[]} Blocks in source order
 */
function splitBlocks(css) {
  const blocks = [];
  let i = 0;
  let start = 0;
  let depth = 0;
  let preludeEnd = -1;
  const push = (body, end) => {
    const prelude = css.slice(start, body === undefined ? end : preludeEnd);
    blocks.push({
      prelude: prelude.trim(),
      body,
      text: css.slice(start, end + 1),
    });
    start = end + 1;
  };
  // `{` opens, `}` closes, top-level `;` ends a statement like `@import …;`.
  const onStructural = (ch, at) => {
    if (ch === "{") {
      if (depth === 0) preludeEnd = at;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) push(css.slice(preludeEnd + 1, at), at);
    } else if (ch === ";" && depth === 0) {
      push(undefined, at);
    }
  };
  while (i < css.length) {
    const ch = css[i];
    const isComment = ch === "/" && css[i + 1] === "*";
    if (isComment || ch === '"' || ch === "'") {
      const next = skipToken(css, i);
      // A comment between top-level blocks (e.g. the `/*! tailwindcss … */`
      // banner) is not part of the next prelude: advance `start` past it.
      if (isComment && depth === 0 && css.slice(start, i).trim() === "") {
        start = next;
      }
      i = next;
      continue;
    }
    onStructural(ch, i);
    i++;
  }
  const rest = css.slice(start);
  if (rest.trim())
    blocks.push({ prelude: rest.trim(), body: undefined, text: rest });
  return blocks;
}

const SPACING_DECL = /--(?:tw-sp|sg-sp|sp)-/;
const THEME_DECL = /--(?:sg|color)-/;

/**
 * Breakdown group of one rule.
 * @param {{ prelude: string, body?: string | undefined }} block - Rule from `splitBlocks`
 * @param {string | undefined} layer - Enclosing `@layer` name, if any
 * @returns {"font" | "preflight" | "themeVars" | "spacing" | "utilities" | "other"} Group name
 */
function classifyRule(block, layer) {
  const { prelude, body = "" } = block;
  if (prelude.startsWith("@font-face")) return "font";
  if (prelude.startsWith("@property")) return "other";
  if (
    /\.sp-/.test(prelude) ||
    (SPACING_DECL.test(body) && !THEME_DECL.test(body))
  )
    return "spacing";
  if (THEME_DECL.test(body) && /^(:root|html|\[data-)/.test(prelude))
    return "themeVars";
  if (layer === "theme") return "themeVars";
  if (layer === "base") return "preflight";
  if (layer === "properties") return "other";
  if (layer === "utilities") return "utilities";
  if (/^(html|body|\*|:host)/.test(prelude)) return "preflight";
  return "other";
}

const groups = {
  font: [],
  preflight: [],
  themeVars: [],
  spacing: [],
  utilities: [],
  other: [],
};
const selectors = [];

/**
 * Assign every rule in `css` to a group and record its selectors.
 * @param {string} css - CSS text
 * @param {string | undefined} layer - Enclosing `@layer` name, if any
 */
function walk(css, layer) {
  for (const block of splitBlocks(css)) {
    const layerMatch = /^@layer\s+([a-z-]+)$/.exec(block.prelude);
    if (layerMatch && block.body !== undefined) {
      walk(block.body, layerMatch[1]);
      continue;
    }
    if (
      /^@(media|supports|container)/.test(block.prelude) &&
      block.body !== undefined
    ) {
      // Classify by content: the wrapper's bytes follow its first classified child.
      const inner = splitBlocks(block.body);
      const kind = inner.length ? classifyRule(inner[0], layer) : "other";
      groups[kind].push(block.text);
      collectSelectors(block.body);
      continue;
    }
    if (!block.prelude.startsWith("@")) selectors.push(block.prelude);
    groups[classifyRule(block, layer)].push(block.text);
  }
}

/**
 * Record the selectors of every style rule in `css`, descending into at-rules.
 * @param {string} css - CSS text
 */
function collectSelectors(css) {
  for (const block of splitBlocks(css)) {
    if (block.body === undefined) continue;
    if (block.prelude.startsWith("@")) collectSelectors(block.body);
    else selectors.push(block.prelude);
  }
}

const files = collectCssFiles(target);
const css = files.map((f) => readFileSync(f, "utf8")).join("\n");
walk(css, undefined);

const classSet = new Set();
for (const sel of selectors) {
  for (const m of sel.matchAll(
    /\.((?:\\[0-9a-fA-F]{1,6}\s?|\\.|[A-Za-z0-9_-])+)/g,
  )) {
    const name = m[1]
      .replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) =>
        String.fromCodePoint(parseInt(hex, 16)),
      )
      .replace(/\\(.)/g, "$1");
    classSet.add(name);
  }
}
const classes = [...classSet].sort();
const size = (s) => ({ raw: Buffer.byteLength(s), gzip: gzipSync(s).length });
const report = {
  files: files.length,
  total: size(css),
  classSelectors: classes.length,
  breakdown: Object.fromEntries(
    Object.entries(groups).map(([k, parts]) => [k, size(parts.join(""))]),
  ),
};

if (classesOut) writeFileSync(classesOut, classes.join("\n") + "\n");

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`files: ${report.files}`);
  console.log(`total: ${report.total.raw} B raw, ${report.total.gzip} B gzip`);
  console.log(`class selectors: ${report.classSelectors}`);
  for (const [k, v] of Object.entries(report.breakdown)) {
    console.log(
      `  ${k.padEnd(10)} ${String(v.raw).padStart(7)} B raw  ${String(v.gzip).padStart(6)} B gzip`,
    );
  }
  const sum = Object.values(report.breakdown).reduce((s, v) => s + v.raw, 0);
  console.log(`breakdown raw sum: ${sum} B (total ${report.total.raw} B)`);
  if (classesOut) console.log(`classes written: ${classesOut}`);
}
