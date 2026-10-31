#!/usr/bin/env node
/**
 * Keeps tutorial code blocks equal to real example code. A fenced block whose
 * nearest non-blank line before it is
 *
 *   <!-- embed: <repo-relative path>[#<region>] -->
 *
 * is filled from that file (or from the lines between `#region docs:<name>`
 * and `#endregion docs:<name>` in it, in any comment syntax).
 *
 *   --write   rewrite the blocks (yarn docs:embed)
 *   --check   fail when a block differs from its source (yarn check:docs-embed)
 *   --root    repository root (default: the repo of this script)
 */
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import * as prettier from "prettier";

import {
  docMarkdownFiles,
  parseFences,
  repoRootFromArgs,
} from "./doc-markdown.mjs";

const EMBED_MARKER = /^<!-- embed: ([^\s#]+)(?:#([a-z0-9-]+))? -->$/;
const ALLOWED_DIRS = /^(examples|packages|src)\//;
const ALLOWED_EXT = /\.(ts|tsx|vue|css|json)$/;
const USAGE = "usage: docs-embed.mjs --write|--check [--root <dir>]";

/**
 * Whether an embed path may be read: a repo file under `examples/`,
 * `packages/` or `src/` with a code extension, not leaving the repo through
 * `..`, an absolute path or a symlink.
 * @param {string} root - Repository root
 * @param {string} p - Path captured from the embed marker
 * @returns {{ ok: boolean, abs: string }} `ok` is false for a rejected path
 */
function confine(root, p) {
  const abs = resolve(root, p);
  if (isAbsolute(p)) return { ok: false, abs };
  const rel = relative(root, abs).split(sep).join("/");
  if (rel === "" || rel === ".." || rel.startsWith("../") || isAbsolute(rel)) {
    return { ok: false, abs };
  }
  if (!ALLOWED_DIRS.test(rel) || !ALLOWED_EXT.test(rel)) {
    return { ok: false, abs };
  }
  if (
    existsSync(abs) &&
    !realpathSync(abs).startsWith(realpathSync(root) + sep)
  ) {
    return { ok: false, abs };
  }
  return { ok: true, abs };
}

/**
 * Lines of a source file selected by an embed marker, with region marker lines
 * dropped, common indentation removed and blank edges trimmed.
 * @param {string} source - File text
 * @param {string | undefined} region - Region name, or undefined for the file
 * @returns {string[] | null} Lines, or null when the region is not found
 */
function extract(source, region) {
  let lines = source.split("\n");
  if (region !== undefined) {
    const open = new RegExp(`#region docs:${region}(?![a-z0-9-])`);
    const end = new RegExp(`#endregion docs:${region}(?![a-z0-9-])`);
    const opens = lines.flatMap((l, i) => (open.test(l) ? [i] : []));
    if (opens.length !== 1) return null;
    const close = lines.findIndex((l, i) => i > opens[0] && end.test(l));
    if (close === -1) return null;
    lines = lines.slice(opens[0] + 1, close);
  }
  lines = lines.filter((l) => !/#(?:end)?region docs:/.test(l));
  const indents = lines
    .filter((l) => l.trim() !== "")
    .map((l) => /^[ \t]*/.exec(l)?.[0].length ?? 0);
  const strip = indents.length > 0 ? Math.min(...indents) : 0;
  lines = lines.map((l) => (l.trim() === "" ? "" : l.slice(strip)));
  while (lines.length > 0 && lines[0] === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/**
 * Rebuilds one markdown file with its embedded blocks refreshed.
 * @param {string} root - Repository root
 * @param {string} md - Repo-relative markdown path
 * @param {string} text - Current file text
 * @param {string[]} errors - Receives one message per problem
 * @returns {Promise<{ next: string, blocks: number }>} Formatted text and the number of embed blocks
 */
async function embedFile(root, md, text, errors) {
  const lines = text.split("\n");
  const fences = parseFences(text).filter((f) =>
    f.marker?.startsWith("<!-- embed:"),
  );
  if (fences.length === 0) return { next: text, blocks: 0 };
  let blocks = 0;
  for (const fence of fences.reverse()) {
    const at = `${md}:${String(fence.open + 1)}`;
    const m = EMBED_MARKER.exec(fence.marker ?? "");
    if (!m) {
      errors.push(`${at}: malformed embed marker ${fence.marker ?? ""}`);
      continue;
    }
    blocks++;
    const [, p, region] = m;
    const { ok, abs } = confine(root, p);
    if (!ok) {
      errors.push(
        `${at}: embed path ${p} not allowed (repo file under examples/, packages/ or src/ with extension .ts .tsx .vue .css .json)`,
      );
      continue;
    }
    if (!existsSync(abs)) {
      errors.push(`${at}: ${p} not found`);
      continue;
    }
    const code = extract(readFileSync(abs, "utf8"), region);
    if (code === null) {
      errors.push(`${at}: region ${String(region)} not found in ${p}`);
      continue;
    }
    lines.splice(
      fence.open + 1,
      fence.close - fence.open - 1,
      ...code.map((l) => (l === "" ? l : fence.indent + l)),
    );
  }
  const file = join(root, md);
  const options = (await prettier.resolveConfig(file)) ?? {};
  const next = await prettier.format(lines.join("\n"), {
    ...options,
    filepath: file,
  });
  return { next, blocks };
}

/**
 * Entry point.
 * @returns {Promise<number>} Process exit code
 */
async function main() {
  const args = process.argv.slice(2);
  const rest = args.filter(
    (a, i) => a !== "--root" && args[i - 1] !== "--root",
  );
  const mode = rest[0];
  if (rest.length !== 1 || (mode !== "--write" && mode !== "--check")) {
    console.error(USAGE);
    return 2;
  }
  const root = repoRootFromArgs(process.argv, import.meta.url);
  /** @type {string[]} */
  const errors = [];
  let blocks = 0;
  let files = 0;
  for (const md of docMarkdownFiles(root)) {
    const text = readFileSync(join(root, md), "utf8");
    if (!text.includes("<!-- embed:")) continue;
    const result = await embedFile(root, md, text, errors);
    if (result.blocks === 0) continue;
    files++;
    blocks += result.blocks;
    if (result.next === text) continue;
    if (mode === "--write") {
      writeFileSync(join(root, md), result.next);
      console.log(`docs-embed: updated ${md}`);
    } else {
      errors.push(`${md}: embedded code is out of date; run yarn docs:embed`);
    }
  }
  for (const e of errors) console.error(e);
  if (errors.length > 0) return 1;
  console.log(
    mode === "--write"
      ? `docs-embed: ${String(blocks)} blocks written`
      : `docs-embed: ${String(blocks)} blocks in ${String(files)} files up to date`,
  );
  return 0;
}

process.exitCode = await main();
