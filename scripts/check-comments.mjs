#!/usr/bin/env node
/**
 * Comment ceiling for hand-written source under `src/` (tests, `*.test-d.ts`,
 * `*.d.ts` and `__integration__` are skipped). Fails when a JSDoc block spans
 * more than 8 lines, any other comment run more than 3 lines, or comment-only
 * lines reach 20 % of all lines of the checked files. Long rationale belongs
 * in `documents/architecture.md` with a one-line pointer.
 *
 * Usage: node scripts/check-comments.mjs [--report] [--dirs a,b] [--root dir]
 *   --report  print `ratio`, `longest` and per-directory numbers, exit 0
 *   --dirs    comma-separated files or directories under the root (default `src`)
 *   --root    project root (default: the repository this script lives in)
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import * as ts from "typescript";

const MAX_JSDOC = 8;
const MAX_RUN = 3;
const MAX_RATIO = 0.2;

const args = process.argv.slice(2);
/**
 * @param {string} name - Option name, e.g. `--dirs`
 * @returns {string | undefined} The value after the option
 */
const option = (name) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};

const root = resolve(
  option("--root") ?? join(dirname(fileURLToPath(import.meta.url)), ".."),
);
const scopes = (option("--dirs") ?? "src")
  .split(",")
  .map((scope) => scope.trim())
  .filter(Boolean);

/**
 * @param {string} rel - Root-relative POSIX path
 * @returns {boolean} Whether the file is hand-written source the ceiling covers
 */
const isChecked = (rel) =>
  rel.endsWith(".ts") &&
  !/\.(test|test-d|d)\.ts$/.test(rel) &&
  !rel.split("/").includes("__integration__");

/**
 * @param {string} abs - File or directory
 * @param {string[]} out - Collected file paths
 */
function walk(abs, out) {
  if (statSync(abs).isDirectory()) {
    for (const name of readdirSync(abs).sort()) walk(join(abs, name), out);
  } else out.push(abs);
}

/**
 * Every comment the parser sees: the leading trivia of each token, so a `//`
 * inside a string, template or regex literal is never mistaken for one.
 * @param {ts.SourceFile} sf - Parsed file
 * @returns {ts.CommentRange[]} Comment ranges in source order
 */
function commentRanges(sf) {
  const seen = new Set();
  /** @type {ts.CommentRange[]} */
  const found = [];
  /** @param {ts.Node} node - Node to visit */
  const visit = (node) => {
    const isJsdocNode =
      node.kind >= ts.SyntaxKind.FirstJSDocNode &&
      node.kind <= ts.SyntaxKind.LastJSDocNode;
    if (isJsdocNode) return;
    const children = node.getChildren(sf);
    children.forEach(visit);
    if (children.length > 0) return;
    const leading = ts.getLeadingCommentRanges(sf.text, node.getFullStart());
    for (const range of leading ?? []) {
      if (seen.has(range.pos)) continue;
      seen.add(range.pos);
      found.push(range);
    }
  };
  visit(sf);
  return found.sort((a, b) => a.pos - b.pos);
}

/**
 * Groups adjacent standalone non-JSDoc comments into runs and reports the
 * ones over the ceiling.
 * @param {string} rel - Root-relative POSIX path, for messages
 * @param {string[]} violations - Receives one message per long run
 * @returns {{ add: (first: number, last: number) => void, close: () => number }} `add` extends or starts a run, `close` ends it and returns its length
 */
function runTracker(rel, violations) {
  /** @type {{ first: number, last: number } | undefined} */
  let run;
  return {
    add(first, last) {
      if (run && first === run.last + 1) run.last = last;
      else {
        this.close();
        run = { first, last };
      }
    },
    close() {
      if (!run) return 0;
      const length = run.last - run.first + 1;
      if (length > MAX_RUN)
        violations.push(
          `${rel}:${run.first + 1}: comment run of ${length} lines (max ${MAX_RUN})`,
        );
      run = undefined;
      return length;
    },
  };
}

/**
 * @param {string} rel - Root-relative POSIX path
 * @param {string} text - File contents
 * @returns {{ commentLines: number, codeLines: number, longest: number, violations: string[] }} Measures of one file
 */
function measure(rel, text) {
  const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, false);
  const starts = sf.getLineStarts();
  const lineOf = (/** @type {number} */ pos) =>
    sf.getLineAndCharacterOfPosition(pos).line;
  /** @type {string[]} */
  const violations = [];
  const runs = runTracker(rel, violations);
  let commentLines = 0;
  let longest = 0;

  for (const range of commentRanges(sf)) {
    const first = lineOf(range.pos);
    const last = lineOf(range.end);
    const standalone = text.slice(starts[first], range.pos).trim() === "";
    commentLines += last - first + (standalone ? 1 : 0);
    const isJsdoc =
      text.startsWith("/**", range.pos) && text[range.pos + 3] !== "/";
    if (isJsdoc || !standalone) longest = Math.max(longest, runs.close());
    if (isJsdoc) {
      const length = last - first + 1;
      longest = Math.max(longest, length);
      if (length > MAX_JSDOC)
        violations.push(
          `${rel}:${first + 1}: JSDoc block of ${length} lines (max ${MAX_JSDOC})`,
        );
    } else if (standalone) runs.add(first, last);
  }
  longest = Math.max(longest, runs.close());
  const codeLines = text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
  return { commentLines, codeLines, longest, violations };
}

/** @type {string[]} */
const files = [];
try {
  for (const scope of scopes) walk(resolve(root, scope), files);
} catch (error) {
  console.error(
    `check-comments: ${error instanceof Error ? error.message : error}`,
  );
  process.exit(2);
}

/** @type {Map<string, { comments: number, lines: number, longest: number, files: number }>} */
const groups = new Map();
const total = { comments: 0, lines: 0, longest: 0, files: 0 };
/** @type {string[]} */
const violations = [];
for (const abs of files) {
  const rel = relative(root, abs).split(sep).join("/");
  if (!isChecked(rel)) continue;
  const result = measure(rel, readFileSync(abs, "utf8"));
  const parts = rel.split("/");
  const key = parts.length > 2 ? parts.slice(0, 2).join("/") : rel;
  const group = groups.get(key) ?? {
    comments: 0,
    lines: 0,
    longest: 0,
    files: 0,
  };
  for (const sum of [group, total]) {
    sum.comments += result.commentLines;
    sum.lines += result.codeLines;
    sum.longest = Math.max(sum.longest, result.longest);
    sum.files += 1;
  }
  groups.set(key, group);
  violations.push(...result.violations);
}

/**
 * @param {number} comments - Comment-only lines
 * @param {number} lines - All lines
 * @returns {string} Percentage with one decimal
 */
const percent = (comments, lines) =>
  (lines === 0 ? 0 : (100 * comments) / lines).toFixed(1);

if (args.includes("--report")) {
  console.log(`ratio: ${percent(total.comments, total.lines)}%`);
  console.log(`longest: ${total.longest}`);
  console.log(`violations: ${violations.length}`);
  for (const [key, g] of [...groups].sort(([a], [b]) => a.localeCompare(b)))
    console.log(
      `${key}: ratio ${percent(g.comments, g.lines)}%, longest ${g.longest}, files ${g.files}`,
    );
  process.exit(0);
}

if (total.lines > 0 && total.comments / total.lines >= MAX_RATIO)
  violations.push(
    `comment-only lines are ${percent(total.comments, total.lines)}% of ${total.lines} lines (max under ${MAX_RATIO * 100}%)`,
  );
if (violations.length > 0) {
  for (const line of violations) console.error(line);
  console.error(`check-comments: ${violations.length} problem(s)`);
  process.exit(1);
}
console.log(
  `check-comments: ok (${total.files} files, ratio ${percent(total.comments, total.lines)}%, longest ${total.longest})`,
);
