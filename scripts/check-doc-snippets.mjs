#!/usr/bin/env node
/**
 * Type-checks every `ts`/`tsx`/`typescript` fenced block of README.md and
 * documents/ (not plans, brainstorm, migration) against the built `dist/*.d.ts`.
 *
 * Skipped blocks, by the marker on the nearest non-blank line before the fence:
 *   <!-- embed: ... -->            filled from a real example file (docs-embed)
 *   <!-- signature: ... -->        generated declaration (check-doc-exports)
 *   <!-- snippet: no-check <why> --> opted out; a reason is required and at
 *                                  most 10% of all blocks may opt out
 *
 * Needs `yarn build:all` first. `--root <dir>` points at another repo tree.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import * as ts from "typescript";

import {
  docMarkdownFiles,
  parseFences,
  repoRootFromArgs,
} from "./doc-markdown.mjs";

const NO_CHECK_OPEN = "<!-- snippet: no-check";

/**
 * @param {string} marker - A `<!-- snippet: no-check ... -->` marker line
 * @returns {string} The reason text, "" when there is none
 */
function noCheckReason(marker) {
  if (!marker.endsWith("-->")) return "";
  return marker.slice(NO_CHECK_OPEN.length, -3).trim();
}
const FIXTURES = ["theme.json", "style-gen.options.ts", "tokens.ts"];
const MAX_OPT_OUT_PERCENT = 10;

/**
 * @typedef {object} Counts
 * @property {number} checked - Blocks sent to the compiler
 * @property {number} embedded - Blocks filled by docs-embed
 * @property {number} optedOut - Blocks with a no-check marker
 * @property {number} signatures - Generated signature blocks (not counted in the total)
 */

/**
 * Writes every checkable block of one markdown file into the work dir.
 * @param {string} root - Repository root
 * @param {string} dir - Work dir
 * @param {string} md - Repo-relative markdown path
 * @param {Counts} counts - Updated in place
 * @param {Map<string, { md: string, fenceLine: number }>} written - Receives `file → origin`
 * @param {string[]} errors - Receives one message per problem
 * @returns {void}
 */
function collectBlocks(root, dir, md, counts, written, errors) {
  for (const fence of parseFences(readFileSync(join(root, md), "utf8"))) {
    if (!["ts", "tsx", "typescript"].includes(fence.lang)) continue;
    const fenceLine = fence.open + 1;
    const marker = fence.marker ?? "";
    if (marker.startsWith("<!-- embed: ")) {
      counts.embedded++;
    } else if (marker.startsWith("<!-- signature: ")) {
      counts.signatures++;
    } else if (marker.startsWith(NO_CHECK_OPEN)) {
      if (noCheckReason(marker) === "") {
        errors.push(`${md}:${String(fenceLine)}: no-check needs a reason`);
      } else counts.optedOut++;
    } else {
      const ext = fence.lang === "tsx" ? "tsx" : "ts";
      const name = `${md.replace(/[/.]/g, "_")}__L${String(fenceLine)}.${ext}`;
      const file = join(dir, name);
      writeFileSync(file, `${fence.body.join("\n")}\nexport {};\n`);
      written.set(file, { md, fenceLine });
      counts.checked++;
    }
  }
}

/**
 * Compiler diagnostics for the written snippet files, mapped back to markdown lines.
 * @param {string} root - Repository root
 * @param {string} scriptRepo - Repo that holds this script and its node_modules
 * @param {Map<string, { md: string, fenceLine: number }>} written - Snippet file → origin
 * @returns {string[]} One printable line per diagnostic
 */
function compile(root, scriptRepo, written) {
  /** @type {ts.CompilerOptions} */
  const options = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    esModuleInterop: true,
    resolveJsonModule: true,
    types: ["node"],
    typeRoots: [join(scriptRepo, "node_modules/@types")],
    paths: {
      "@duydpdev/style-generator": [join(root, "dist/index.d.ts")],
      "@duydpdev/style-generator/*": [join(root, "dist/*.d.ts")],
    },
  };
  const program = ts.createProgram([...written.keys()], options);
  /** @type {string[]} */
  const lines = [];
  for (const d of ts.getPreEmitDiagnostics(program)) {
    const message = ts.flattenDiagnosticMessageText(d.messageText, " ");
    if (!d.file || d.start === undefined) {
      lines.push(`<global>: TS${String(d.code)} ${message}`);
      continue;
    }
    const origin = written.get(resolve(d.file.fileName));
    if (!origin) continue;
    const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
    lines.push(
      `${origin.md}:${String(origin.fenceLine + 1 + line)}:${String(character + 1)} TS${String(d.code)} ${message}`,
    );
  }
  return lines;
}

/**
 * Entry point.
 * @returns {number} Process exit code
 */
function main() {
  const root = repoRootFromArgs(process.argv, import.meta.url);
  const scriptRepo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  if (!existsSync(join(root, "dist/index.d.ts"))) {
    console.error(
      `check-doc-snippets: ${join(root, "dist/index.d.ts")} not found; run yarn build:all first`,
    );
    return 2;
  }
  const hash = createHash("sha256").update(root).digest("hex").slice(0, 8);
  const dir = join(scriptRepo, "node_modules/.cache/doc-snippets", hash);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const name of FIXTURES) {
    const from = join(root, "examples/design-system/src", name);
    if (existsSync(from)) copyFileSync(from, join(dir, name));
  }

  /** @type {Counts} */
  const counts = { checked: 0, embedded: 0, optedOut: 0, signatures: 0 };
  /** @type {Map<string, { md: string, fenceLine: number }>} */
  const written = new Map();
  /** @type {string[]} */
  const errors = [];
  for (const md of docMarkdownFiles(root))
    collectBlocks(root, dir, md, counts, written, errors);
  if (written.size > 0) errors.push(...compile(root, scriptRepo, written));

  const total = counts.checked + counts.embedded + counts.optedOut;
  const overBudget = counts.optedOut * MAX_OPT_OUT_PERCENT > total;
  for (const e of errors) console.error(e);
  if (overBudget) {
    console.error(
      `check-doc-snippets: ${String(counts.optedOut)} of ${String(total)} blocks opted out (> ${String(MAX_OPT_OUT_PERCENT)}%)`,
    );
  }
  const pct =
    total === 0 ? "0.0" : ((counts.optedOut / total) * 100).toFixed(1);
  console.log(
    `check-doc-snippets: ${String(counts.checked)} checked, ${String(counts.embedded)} embedded, ${String(counts.optedOut)} opted out of ${String(total)} (${pct}%), ${String(counts.signatures)} signatures skipped, ${String(errors.length)} errors`,
  );
  return errors.length > 0 || overBudget ? 1 : 0;
}

process.exitCode = main();
