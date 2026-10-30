/**
 * Shared helpers of the docs scripts (`docs-embed.mjs`,
 * `check-doc-snippets.mjs`, `check-doc-exports.mjs`): repo root selection,
 * the list of markdown files they cover, and a fenced-code-block parser.
 */
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Repo-relative prefixes whose markdown the docs scripts never read. */
const EXCLUDED_PREFIXES = [
  "documents/plans/",
  "documents/brainstorm/",
  // Migration guides show removed 3.x/4.x APIs on purpose.
  "documents/migration/",
];

/**
 * Repository root the script works on: the `--root <dir>` argument when
 * present (tests run the scripts against a temp tree), else the repo that
 * contains the script.
 * @param {string[]} argv - `process.argv`
 * @param {string} scriptUrl - `import.meta.url` of the calling script
 * @returns {string} Absolute root directory
 */
export function repoRootFromArgs(argv, scriptUrl) {
  const at = argv.indexOf("--root");
  if (at === -1) return resolve(dirname(fileURLToPath(scriptUrl)), "..");
  const value = argv[at + 1];
  if (value === undefined) throw new Error("--root needs a directory");
  return resolve(value);
}

/**
 * Markdown files covered by the docs checks: `README.md` plus every `*.md`
 * under `documents/`, minus plans, brainstorm and migration guides.
 * @param {string} root - Repository root
 * @returns {string[]} Sorted POSIX repo-relative paths
 */
export function docMarkdownFiles(root) {
  /** @type {string[]} */
  const files = ["README.md"];
  /**
   * @param {string} rel - POSIX directory path relative to the root
   * @returns {void}
   */
  const walk = (rel) => {
    let entries;
    try {
      entries = readdirSync(join(root, rel), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = `${rel}/${entry.name}`;
      if (EXCLUDED_PREFIXES.some((p) => `${path}/`.startsWith(p))) continue;
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".md")) files.push(path);
    }
  };
  walk("documents");
  return files.sort();
}

/**
 * @typedef {object} Fence
 * @property {string} lang - Info word of the opening fence, lowercased
 * @property {string} indent - Whitespace before the opening fence
 * @property {number} open - 0-based line index of the opening fence
 * @property {number} close - 0-based line index of the closing fence
 * @property {string[]} body - Lines between the fences, `indent` stripped
 * @property {string | null} marker - Trimmed nearest non-blank line before
 *   `open` when it is an HTML comment, else `null`
 */

/**
 * @param {string[]} lines - Markdown lines
 * @param {number} open - 0-based index of the opening fence
 * @param {string} ticks - The opening fence characters
 * @returns {number} 0-based index of the closing fence
 * @throws {Error} `unclosed fence at line <n>` when the fence never closes
 */
function closingFence(lines, open, ticks) {
  const closer = new RegExp(`^\\s*${ticks[0]}{${String(ticks.length)},}\\s*$`);
  const close = lines.findIndex((l, j) => j > open && closer.test(l));
  if (close === -1)
    throw new Error(`unclosed fence at line ${String(open + 1)}`);
  return close;
}

/**
 * @param {string[]} lines - Markdown lines
 * @param {number} open - 0-based index of the opening fence
 * @returns {string | null} Nearest non-blank line before `open`, trimmed, when it is an HTML comment
 */
function markerBefore(lines, open) {
  let k = open - 1;
  while (k >= 0 && lines[k].trim() === "") k--;
  const before = k >= 0 ? lines[k].trim() : "";
  return before.startsWith("<!--") ? before : null;
}

/**
 * Fenced code blocks of a markdown text.
 * @param {string} markdown - Markdown source
 * @returns {Fence[]} Blocks in document order
 * @throws {Error} `unclosed fence at line <n>` when a fence never closes
 */
export function parseFences(markdown) {
  const lines = markdown.split("\n");
  /** @type {Fence[]} */
  const fences = [];
  let i = 0;
  while (i < lines.length) {
    const m = /^(\s*)(`{3,}|~{3,})([\w-]*)\s*$/.exec(lines[i]);
    if (!m) {
      i++;
      continue;
    }
    const [, indent, ticks, info] = m;
    const close = closingFence(lines, i, ticks);
    fences.push({
      lang: info.toLowerCase(),
      indent,
      open: i,
      close,
      body: lines
        .slice(i + 1, close)
        .map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l)),
      marker: markerBefore(lines, i),
    });
    i = close + 1;
  }
  return fences;
}
