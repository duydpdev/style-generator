#!/usr/bin/env node
/**
 * Keeps the name lists and rule tables of the docs equal to the packaged
 * canvas standard (`src/cli/canvas/design-canvas-standard.json`). The lines
 * between
 *
 *   <!-- standard-table: <name> -->
 *   <!-- /standard-table -->
 *
 * are rebuilt from the standard. Names: `grammar`, `renames`, `descriptions`,
 * `scales`, `rules`. A Vietnamese twin carries the same regions; the tables
 * hold data (key names, the standard's English descriptions), not prose.
 *
 *   --write   rewrite the regions (yarn docs:standard)
 *   --check   fail when a region differs from the standard
 *   --root    repository root (default: the repo of this script)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import * as prettier from "prettier";

import { docMarkdownFiles, repoRootFromArgs } from "./doc-markdown.mjs";

const STANDARD = "src/cli/canvas/design-canvas-standard.json";
const OPEN = /^<!-- standard-table: ([a-z-]+) -->$/;
const CLOSE = "<!-- /standard-table -->";
const USAGE = "usage: docs-standard-tables.mjs --write|--check [--root <dir>]";

/**
 * @typedef {object} Standard
 * @property {string[]} semanticCore - The colour keys every theme has
 * @property {{ neutral: string[], roles: string[], suffixes: string[], states: string[], renames: Record<string, string> }} grammar - The v2 key grammar
 * @property {Record<string, { kind: string, steps: string[] }>} scales - Closed scales by theme category
 * @property {Record<string, string>} descriptions - Default description by colour key
 * @property {Record<string, { basis: { type: string, source?: string } }>} rules - Rules by id
 */

const code = (/** @type {string} */ value) => `\`${value}\``;
const list = (/** @type {readonly string[]} */ values) =>
  values.map(code).join(", ");
const cell = (/** @type {string} */ text) =>
  text.replaceAll("|", String.raw`\|`);

/**
 * A markdown table.
 * @param {string[]} head - Column titles
 * @param {string[][]} rows - Cells per row
 * @returns {string} The table, unaligned
 */
function table(head, rows) {
  const line = (/** @type {string[]} */ cells) => `| ${cells.join(" | ")} |`;
  return [line(head), line(head.map(() => "---")), ...rows.map(line)].join(
    "\n",
  );
}

/**
 * Every generated table of a standard.
 * @param {Standard} standard - The parsed standard
 * @returns {Record<string, string>} Table text by region name
 */
function tablesOf(standard) {
  const { grammar } = standard;
  return {
    grammar: table(
      ["Part", "Values"],
      [
        ["Neutral keys", list(grammar.neutral)],
        ["Roles", list(grammar.roles)],
        ["Suffixes, in this order", list(grammar.suffixes)],
        ["States, at most one, always last", list(grammar.states)],
        ["Semantic core", list(standard.semanticCore)],
      ],
    ),
    renames: table(
      ["v1 name", "v2 name"],
      Object.entries(grammar.renames).map(([from, to]) => [
        code(from),
        code(to),
      ]),
    ),
    descriptions: table(
      ["Key", "Default description"],
      Object.entries(standard.descriptions).map(([key, text]) => [
        code(key),
        cell(text),
      ]),
    ),
    scales: table(
      ["Scale", "Kind", "Steps"],
      Object.entries(standard.scales).map(([name, scale]) => [
        code(name),
        scale.kind,
        list(scale.steps),
      ]),
    ),
    rules: table(
      ["Rule", "Basis", "Source"],
      Object.entries(standard.rules).map(([id, rule]) => [
        code(id),
        rule.basis.type,
        cell(rule.basis.source ?? ""),
      ]),
    ),
  };
}

/**
 * Rebuilds one markdown file with its regions refreshed.
 * @param {string} root - Repository root
 * @param {string} md - Repo-relative markdown path
 * @param {string} text - Current file text
 * @param {Record<string, string>} tables - Table text by region name
 * @param {string[]} errors - Receives one message per problem
 * @returns {Promise<{ next: string, regions: number }>} Formatted text and the number of regions
 */
async function fillFile(root, md, text, tables, errors) {
  const lines = text.split("\n");
  let regions = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    const open = OPEN.exec(lines[i] ?? "");
    if (!open) continue;
    const at = `${md}:${String(i + 1)}`;
    const name = open[1] ?? "";
    const close = lines.findIndex((l, j) => j > i && l === CLOSE);
    const table = tables[name];
    if (close === -1 || table === undefined) {
      errors.push(
        close === -1
          ? `${at}: standard-table ${name} has no closing ${CLOSE}`
          : `${at}: unknown standard table ${name}`,
      );
      continue;
    }
    regions++;
    lines.splice(i + 1, close - i - 1, "", ...table.split("\n"), "");
  }
  const file = join(root, md);
  const options = (await prettier.resolveConfig(file)) ?? {};
  const next = await prettier.format(lines.join("\n"), {
    ...options,
    filepath: file,
  });
  return { next, regions };
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
  const standard = /** @type {Standard} */ (
    JSON.parse(readFileSync(join(root, STANDARD), "utf8"))
  );
  const tables = tablesOf(standard);
  /** @type {string[]} */
  const errors = [];
  let regions = 0;
  let files = 0;
  for (const md of docMarkdownFiles(root)) {
    const text = readFileSync(join(root, md), "utf8");
    if (!text.includes("<!-- standard-table:")) continue;
    const result = await fillFile(root, md, text, tables, errors);
    if (result.regions === 0) continue;
    files++;
    regions += result.regions;
    if (result.next === text) continue;
    if (mode === "--write") {
      writeFileSync(join(root, md), result.next);
      console.log(`docs-standard-tables: updated ${md}`);
    } else {
      errors.push(
        `${md}: a standard table is out of date; run yarn docs:standard`,
      );
    }
  }
  for (const e of errors) console.error(e);
  if (errors.length > 0) return 1;
  console.log(
    mode === "--write"
      ? `docs-standard-tables: ${String(regions)} regions written`
      : `docs-standard-tables: ${String(regions)} regions in ${String(files)} files up to date`,
  );
  return 0;
}

process.exitCode = await main();
