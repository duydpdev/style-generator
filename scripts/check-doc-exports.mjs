#!/usr/bin/env node
/**
 * Reference coverage of the public API. For every `package.json#exports`
 * subpath (except `./package.json`) the page `documents/reference/<page>.md`
 * (`.` → `core`) must have a heading that names each export in an inline code
 * span, and every such heading carries a generated signature block
 *
 *   <!-- signature: Name -->
 *   ```ts
 *   <declaration from dist/*.d.ts>
 *   ```
 *   <TSDoc>
 *   <!-- /signature -->
 *
 * that matches the built declarations. An export without TSDoc, a missing
 * page and a page that belongs to no subpath (besides cli, options, theme) fail.
 *
 *   --write   rewrite the signature blocks (yarn docs:signatures)
 *   --root    repository root (default: the repo of this script)
 *
 * Needs `yarn build:all` first.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import * as prettier from "prettier";
import * as ts from "typescript";

import { repoRootFromArgs } from "./doc-markdown.mjs";

const USAGE = "usage: check-doc-exports.mjs [--write] [--root <dir>]";
const EXTRA_PAGES = new Set(["cli", "options", "theme"]);

/**
 * @typedef {object} Subpath
 * @property {string} key - `package.json#exports` key
 * @property {string} page - Reference page basename without `.md`
 * @property {string} dts - Absolute path of its declaration file
 * @property {ts.Symbol[]} symbols - Its exports
 */

/**
 * Splits a page into lines tagged with whether they sit inside a fenced block.
 * @param {string} text - Markdown source
 * @returns {{ line: string, fenced: boolean }[]} Tagged lines
 */
function tagLines(text) {
  let fence = null;
  return text.split("\n").map((line) => {
    const m = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence === null) {
      if (m) fence = m[1];
      return { line, fenced: m !== null };
    }
    if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
    return { line, fenced: true };
  });
}

/**
 * Leading identifiers of the inline code spans of a heading line.
 * @param {string} line - A markdown line
 * @returns {string[]} Identifiers in order, empty when the line is no heading
 */
function headingIdentifiers(line) {
  if (!/^#{1,4}\s/.test(line)) return [];
  return [...line.matchAll(/`([^`]+)`/g)].flatMap((m) => {
    const id = /^[A-Za-z_$][\w$]*/.exec(m[1]);
    return id ? [id[0]] : [];
  });
}

/**
 * Identifiers named by any heading of a page.
 * @param {string} text - Page text
 * @returns {Set<string>} The names
 */
function headingNames(text) {
  const names = new Set();
  for (const { line, fenced } of tagLines(text)) {
    if (!fenced) for (const id of headingIdentifiers(line)) names.add(id);
  }
  return names;
}

/**
 * Removes every generated signature block from a page.
 * @param {string} text - Page text
 * @returns {string[]} Remaining lines
 */
function withoutBlocks(text) {
  /** @type {string[]} */
  const kept = [];
  let inBlock = false;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!inBlock && trimmed.startsWith("<!-- signature: ")) inBlock = true;
    else if (inBlock && trimmed === "<!-- /signature -->") inBlock = false;
    else if (!inBlock) kept.push(line);
  }
  return kept;
}

/**
 * The symbol a (possibly re-exported) export stands for.
 * @param {ts.TypeChecker} checker - Program checker
 * @param {ts.Symbol} s - Export symbol
 * @returns {ts.Symbol} Declaring symbol
 */
function target(checker, s) {
  // eslint-disable-next-line sonarjs/bitwise-operators -- TypeScript symbol flag test
  return s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s;
}

/**
 * Declaration text of an export, printed from the `.d.ts` without comments.
 * @param {ts.TypeChecker} checker - Program checker
 * @param {ts.Symbol} s - Export symbol
 * @returns {string} Declarations joined with a newline
 */
function signature(checker, s) {
  const printer = ts.createPrinter({
    removeComments: true,
    newLine: ts.NewLineKind.LineFeed,
  });
  /** @type {Set<ts.Node>} */
  const seen = new Set();
  for (const d of target(checker, s).declarations ?? []) {
    seen.add(ts.isVariableDeclaration(d) ? d.parent.parent : d);
  }
  return [...seen]
    .map((n) =>
      printer.printNode(ts.EmitHint.Unspecified, n, n.getSourceFile()),
    )
    .join("\n");
}

/**
 * @param {ts.TypeChecker} checker - Program checker
 * @param {ts.Symbol} s - Export symbol
 * @returns {string} Its TSDoc text, trimmed
 */
function tsdoc(checker, s) {
  return ts
    .displayPartsToString(target(checker, s).getDocumentationComment(checker))
    .trim();
}

/**
 * Text of one signature block.
 * @param {ts.TypeChecker} checker - Program checker
 * @param {ts.Symbol} s - Export symbol
 * @returns {string[]} The block's lines
 */
function blockLines(checker, s) {
  return [
    `<!-- signature: ${s.name} -->`,
    "",
    "```ts",
    signature(checker, s),
    "```",
    "",
    tsdoc(checker, s),
    "",
    "<!-- /signature -->",
  ];
}

/**
 * Expected page text: blocks under each heading for the exports its inline
 * code spans name (an export gets its block under the first heading naming it).
 * @param {ts.TypeChecker} checker - Program checker
 * @param {Subpath} sub - The page's subpath
 * @param {string} text - Current page text
 * @param {string} abs - Absolute path of the page (selects the Prettier config)
 * @returns {Promise<{ next: string, blocks: number }>} Formatted text and block count
 */
async function expectedPage(checker, sub, text, abs) {
  const bySymbol = new Map(sub.symbols.map((s) => [s.name, s]));
  const assigned = new Set();
  /** @type {string[]} */
  const out = [];
  let blocks = 0;
  for (const { line, fenced } of tagLines(withoutBlocks(text).join("\n"))) {
    out.push(line);
    if (fenced) continue;
    const names = headingIdentifiers(line).filter(
      (n) => bySymbol.has(n) && !assigned.has(n),
    );
    for (const name of names) {
      assigned.add(name);
      blocks++;
    }
    if (names.length === 0) continue;
    out.push("");
    for (const name of names) {
      out.push(
        ...blockLines(checker, /** @type {ts.Symbol} */ (bySymbol.get(name))),
        "",
      );
    }
  }

  const options = (await prettier.resolveConfig(abs)) ?? {};
  const next = await prettier.format(out.join("\n"), {
    ...options,
    filepath: abs,
  });
  return { next, blocks };
}

/**
 * Loads every subpath's declaration file into one program.
 * @param {string} root - Repository root
 * @returns {{ checker: ts.TypeChecker, subpaths: Subpath[] } | string} The program data, or an error message
 */
function loadSubpaths(root) {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const entries = Object.keys(pkg.exports)
    .filter((key) => key !== "./package.json")
    .map((key) => ({
      key,
      page: key === "." ? "core" : key.slice(2),
      dts: join(root, pkg.exports[key].import.types),
    }));
  for (const e of entries) {
    if (!existsSync(e.dts)) {
      return `check-doc-exports: ${e.dts} not found; run yarn build:all first`;
    }
  }
  const program = ts.createProgram(
    entries.map((e) => e.dts),
    {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      skipLibCheck: true,
      noEmit: true,
    },
  );
  const checker = program.getTypeChecker();
  const subpaths = entries.map((e) => {
    const file = /** @type {ts.SourceFile} */ (program.getSourceFile(e.dts));
    const mod = /** @type {ts.Symbol} */ (checker.getSymbolAtLocation(file));
    return { ...e, symbols: checker.getExportsOfModule(mod) };
  });
  return { checker, subpaths };
}

/**
 * Collects heading-coverage and orphan-page errors.
 * @param {string} root - Repository root
 * @param {Subpath[]} subpaths - All subpaths
 * @param {Map<string, string>} pages - Page basename → text of the existing pages
 * @returns {string[]} Error messages
 */
function coverageErrors(root, subpaths, pages) {
  /** @type {string[]} */
  const errors = [];
  const headings = new Map(
    [...pages].map(([page, text]) => [page, headingNames(text)]),
  );
  for (const sub of subpaths) {
    const path = `documents/reference/${sub.page}.md`;
    if (!pages.has(sub.page)) {
      errors.push(`${path}: missing (subpath ${sub.key})`);
      continue;
    }
    for (const s of sub.symbols) {
      const covered = (headings.get(sub.page) ?? new Set()).has(s.name);
      const elsewhere =
        sub.key === "." &&
        subpaths.some(
          (o) =>
            o.key !== "." &&
            o.symbols.some((x) => x.name === s.name) &&
            (headings.get(o.page) ?? new Set()).has(s.name),
        );
      if (!covered && !elsewhere) {
        errors.push(
          `${path}: no heading for \`${s.name}\` (export of ${sub.key})`,
        );
      }
    }
  }
  const known = new Set(subpaths.map((s) => s.page));
  const dir = join(root, "documents/reference");
  for (const file of existsSync(dir) ? readdirSync(dir) : []) {
    const base = file.replace(/\.md$/, "");
    if (file.endsWith(".md") && !known.has(base) && !EXTRA_PAGES.has(base)) {
      errors.push(
        `documents/reference/${file}: not a subpath page (allowed extras: ${[...EXTRA_PAGES].join(", ")})`,
      );
    }
  }
  return errors;
}

/**
 * One error per export without TSDoc (a name exported by several subpaths is
 * reported once, on the page of the first subpath that lists it; the root
 * subpath goes last because it re-exports most names).
 * @param {ts.TypeChecker} checker - Program checker
 * @param {Subpath[]} subpaths - All subpaths
 * @returns {string[]} Error messages
 */
function tsdocErrors(checker, subpaths) {
  /** @type {string[]} */
  const errors = [];
  const reported = new Set();
  const ordered = [...subpaths].sort(
    (a, b) => Number(a.key === ".") - Number(b.key === "."),
  );
  for (const sub of ordered) {
    for (const s of sub.symbols) {
      if (tsdoc(checker, s) !== "" || reported.has(s.name)) continue;
      reported.add(s.name);
      errors.push(
        `documents/reference/${sub.page}.md: \`${s.name}\` has no TSDoc in dist (add a /** */ comment to its source declaration)`,
      );
    }
  }
  return errors;
}

/**
 * Checks (or, with `write`, rewrites) the signature blocks of every page.
 * @param {string} root - Repository root
 * @param {ts.TypeChecker} checker - Program checker
 * @param {Subpath[]} subpaths - All subpaths
 * @param {Map<string, string>} pages - Page basename → current text
 * @param {boolean} write - Rewrite instead of reporting
 * @returns {Promise<{ errors: string[], blocks: number }>} Out-of-date pages and the block count
 */
async function signatureErrors(root, checker, subpaths, pages, write) {
  /** @type {string[]} */
  const errors = [];
  let blocks = 0;
  for (const sub of subpaths) {
    const path = `documents/reference/${sub.page}.md`;
    const text = pages.get(sub.page);
    if (text === undefined) continue;
    const result = await expectedPage(checker, sub, text, join(root, path));
    blocks += result.blocks;
    if (result.next === text) continue;
    if (write) {
      writeFileSync(join(root, path), result.next);
      console.log(`check-doc-exports: wrote signature blocks in ${path}`);
    } else {
      errors.push(
        `${path}: signature blocks are out of date; run yarn docs:signatures`,
      );
    }
  }
  return { errors, blocks };
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
  if (rest.some((a) => a !== "--write")) {
    console.error(USAGE);
    return 2;
  }
  const root = repoRootFromArgs(process.argv, import.meta.url);
  const loaded = loadSubpaths(root);
  if (typeof loaded === "string") {
    console.error(loaded);
    return 2;
  }
  const { checker, subpaths } = loaded;
  /** @type {Map<string, string>} */
  const pages = new Map();
  for (const sub of subpaths) {
    const file = join(root, "documents/reference", `${sub.page}.md`);
    if (existsSync(file)) pages.set(sub.page, readFileSync(file, "utf8"));
  }
  const signatures = await signatureErrors(
    root,
    checker,
    subpaths,
    pages,
    rest.includes("--write"),
  );
  const errors = [
    ...coverageErrors(root, subpaths, pages),
    ...tsdocErrors(checker, subpaths),
    ...signatures.errors,
  ];
  const blocks = signatures.blocks;
  for (const e of errors) console.error(e);
  if (errors.length > 0) return 1;
  const total = subpaths.reduce((sum, s) => sum + s.symbols.length, 0);
  console.log(
    `check-doc-exports: ${String(total)} exports across ${String(subpaths.length)} subpaths have a reference heading; ${String(blocks)} signature blocks up to date`,
  );
  return 0;
}

process.exitCode = await main();
