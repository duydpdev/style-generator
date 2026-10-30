#!/usr/bin/env node
/*
 * Site migration audit (phase 08, dogfood-ui-docs-ci). Modes:
 *   jsx [file...]   BANNED_TAGS / className in site TSX (default: all site/src TSX)
 *   classes file... class tokens a file uses + the CSS lines selecting `.token`
 *   refs class...   class-context references per token (all must be 0)
 *   parts           [data-part~="x"] in CSS <-> data-part="… x …" in TSX, both directions,
 *                   and every token listed in the report's `## data-part register`
 *   spacing [tok...] margin/padding/gap or spacing @apply on a [data-part~=…] subject
 *   locators        phase 03 data-testid / data-reveal-state locators still present
 * Exit 0 clean, 1 findings, 2 usage error.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import postcss from "postcss";
import * as ts from "typescript";

import { BANNED_TAGS } from "../../packages/ui-react/registry.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const srcRoot = join(repoRoot, "site/src");
const stylesRoot = join(srcRoot, "styles");
const REPORT = join(
  repoRoot,
  "documents/plans/2026-10-29/dogfood-ui-docs-ci/reports/site-migration.md",
);
const BANNED = new Set(BANNED_TAGS);
const CLASSNAME_OK = new Set(["NavLink", "ReactMarkdown"]);

/**
 * Tokens listed in the report's data-part register table.
 * @returns {Set<string>} registered token names
 */
function registered() {
  const text = readFileSync(REPORT, "utf8");
  const start = text.indexOf("\n## data-part register\n");
  if (start < 0) return new Set();
  const body = text.slice(start + 1).split("\n## ")[0] ?? "";
  return new Set(
    [...body.matchAll(/^\|\s*`([A-Za-z][\w-]*)`\s*\|/gm)].map((m) => m[1]),
  );
}
/**
 * Rows of the report's spacing exceptions table (R0 listed exceptions).
 * @returns {Map<string, { file: string, media: string, selector: string, decl: string }>} rows by id
 */
function exceptions() {
  const text = readFileSync(REPORT, "utf8");
  const start = text.indexOf("\n## Spacing exceptions\n");
  const out = new Map();
  if (start < 0) return out;
  const body = text.slice(start + 1).split("\n## ")[0] ?? "";
  for (const line of body.split("\n")) {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim().replace(/^`|`$/g, ""));
    if (cells.length < 5 || !/^E\d+$/.test(cells[0] ?? "")) continue;
    const [id, file, media, selector, decl] = cells;
    out.set(id, { file, media, selector, decl });
  }
  return out;
}

/**
 * Every .ts/.tsx file below a directory.
 * @param {string} dir directory to walk
 * @returns {string[]} absolute file paths
 */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.tsx?$/.test(name) ? [p] : [];
  });
}
/**
 * Parse one source file.
 * @param {string} file absolute path
 * @returns {ts.SourceFile} the syntax tree
 */
function parse(file) {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    kind,
  );
}
/**
 * Depth-first visit of a node and its descendants.
 * @param {ts.Node} node root
 * @param {(n: ts.Node) => void} fn visitor
 */
function each(node, fn) {
  fn(node);
  ts.forEachChild(node, (c) => {
    each(c, fn);
  });
}
/**
 * Text of every string-like literal below a node.
 * @param {ts.Node | undefined} node root
 * @returns {string[]} literal texts
 */
function strings(node) {
  /* @type {string[]} */
  const out = [];
  if (!node) return out;
  each(node, (n) => {
    if (
      ts.isStringLiteral(n) ||
      ts.isNoSubstitutionTemplateLiteral(n) ||
      ts.isTemplateHead(n) ||
      ts.isTemplateMiddle(n) ||
      ts.isTemplateTail(n)
    )
      out.push(n.text);
  });
  return out;
}
const tokens = (list) =>
  list.flatMap((s) => s.split(/\s+/)).filter((t) => /^[A-Za-z][\w-]*$/.test(t));
const at = (sf, n) =>
  `${relative(repoRoot, sf.fileName)}:${String(sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1)}`;
const attrName = (n) => (ts.isJsxAttribute(n) ? n.name.getText() : "");

/**
 * Class-context tokens of one file.
 * @param {string} file absolute path
 * @returns {Map<string, string[]>} token → locations
 */
function classUses(file) {
  const sf = parse(file);
  /* @type {Map<string, string[]>} */
  const uses = new Map();
  /* @param {string[]} list @param {ts.Node} n */
  const add = (list, n) => {
    for (const t of list) uses.set(t, [...(uses.get(t) ?? []), at(sf, n)]);
  };
  each(sf, (n) => {
    if (attrName(n) === "className" && ts.isJsxAttribute(n))
      add(tokens(strings(n.initializer)), n);
    if (
      ts.isPropertyAssignment(n) &&
      /^(cls|className)$/.test(n.name.getText(sf))
    )
      add(tokens(strings(n.initializer)), n);
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      for (const m of n.text.matchAll(/class="([^"]*)"/g))
        add(tokens([m[1]]), n);
    }
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const fn = n.expression.name.text;
      const target = n.expression.expression.getText(sf);
      if (
        /classList$/.test(target) &&
        /^(add|remove|toggle|contains)$/.test(fn)
      )
        add(tokens(n.arguments.flatMap((a) => strings(a))), n);
      if (/^(querySelector|querySelectorAll|closest|matches)$/.test(fn))
        add(
          n.arguments
            .flatMap((a) => strings(a))
            .flatMap((s) =>
              [...s.matchAll(/\.([A-Za-z][\w-]*)/g)].map((m) => m[1]),
            ),
          n,
        );
    }
  });
  return uses;
}
/* @returns {{ file: string, text: string }[]} */
const cssFiles = () =>
  readdirSync(stylesRoot)
    .filter((n) => n.endsWith(".css"))
    .map((n) => ({
      file: `site/src/styles/${n}`,
      text: readFileSync(join(stylesRoot, n), "utf8"),
    }));
/**
 * CSS locations of a `.token` selector.
 * @param {string} token class name
 * @returns {string[]} file.css:line list
 */
function cssLines(token) {
  const re = new RegExp(`\\.${token.replace(/-/g, "\\-")}(?![\\w-])`);
  return cssFiles().flatMap(({ file, text }) =>
    text
      .split("\n")
      .flatMap((l, i) =>
        re.test(l) && !/^\s*(\/\*|\*)/.test(l)
          ? [`${file}:${String(i + 1)}`]
          : [],
      ),
  );
}

const [mode, ...args] = process.argv.slice(2);
const toAbs = (/* @type {string} */ f) => resolve(repoRoot, f);
let ok = true;
if (mode === "jsx") {
  const files =
    args.length > 0
      ? args.map(toAbs)
      : walk(srcRoot).filter((f) => f.endsWith(".tsx"));
  let tags = 0;
  let cls = 0;
  for (const file of files) {
    const sf = parse(file);
    each(sf, (n) => {
      if (!ts.isJsxOpeningElement(n) && !ts.isJsxSelfClosingElement(n)) return;
      const name = n.tagName.getText(sf);
      if (BANNED.has(name)) {
        tags += 1;
        console.log(`tag ${at(sf, n)} <${name}>`);
      }
      for (const a of n.attributes.properties) {
        if (attrName(a) === "className" && !CLASSNAME_OK.has(name)) {
          cls += 1;
          console.log(`className ${at(sf, n)} <${name}>`);
        }
      }
    });
  }
  console.log(`banned-tags=${String(tags)} className=${String(cls)}`);
  ok = tags + cls === 0;
} else if (mode === "classes" && args.length > 0) {
  for (const file of args.map(toAbs)) {
    for (const [token] of classUses(file))
      console.log(
        `${relative(repoRoot, file)}\t${token}\t${cssLines(token).join(",") || "(no css)"}`,
      );
  }
} else if (mode === "refs" && args.length > 0) {
  /* @type {Map<string, string[]>} */
  const all = new Map();
  for (const file of walk(srcRoot))
    for (const [t, locs] of classUses(file))
      all.set(t, [...(all.get(t) ?? []), ...locs]);
  for (const token of args) {
    const locs = all.get(token) ?? [];
    console.log(`${token} ${String(locs.length)} ${locs.join(" ")}`.trim());
    if (locs.length > 0) ok = false;
  }
} else if (mode === "parts") {
  const cssParts = new Set(
    cssFiles().flatMap(({ text }) =>
      [...text.matchAll(/\[data-part~="([^"]+)"\]/g)].map((m) => m[1]),
    ),
  );
  /* @type {Map<string, string[]>} */
  const attrParts = new Map();
  for (const file of walk(srcRoot)) {
    const sf = parse(file);
    each(sf, (n) => {
      const isAttr = attrName(n) === "data-part" && ts.isJsxAttribute(n);
      const isProp =
        ts.isPropertyAssignment(n) && n.name.getText(sf) === "part";
      if (!isAttr && !isProp) return;
      const init =
        ts.isJsxAttribute(n) || ts.isPropertyAssignment(n)
          ? n.initializer
          : undefined;
      for (const t of tokens(strings(init)))
        attrParts.set(t, [...(attrParts.get(t) ?? []), at(sf, n)]);
    });
  }
  for (const p of cssParts)
    if (!attrParts.has(p)) {
      ok = false;
      console.log(`orphan-css ${p}`);
    }
  for (const [p, locs] of attrParts)
    if (!cssParts.has(p)) {
      ok = false;
      console.log(`orphan-attr ${p} ${locs.join(" ")}`);
    }
  const reg = registered();
  for (const [p, locs] of attrParts)
    if (!reg.has(p)) {
      ok = false;
      console.log(`unlisted ${p} ${locs.join(" ")}`);
    }
  console.log(
    `parts: css=${String(cssParts.size)} attr=${String(attrParts.size)} registered=${String(reg.size)}`,
  );
} else if (mode === "spacing") {
  const only = new Set(args);
  const SPACING = /^(margin|padding)(-|$)|^(gap|row-gap|column-gap)$/;
  /* @param {string} params */
  const applySpacing = (params) =>
    params
      .split(/\s+/)
      .some((t) =>
        /^!?-?(?:[pm][xytrblse]?|gap(?:-[xy])?|space-[xy])-|^sp-/.test(
          t.slice(t.lastIndexOf(":") + 1),
        ),
      );
  /* True when the selector's subject is a hook (or a banned-tag / `*` child of one). @param {string} sel */
  const checked = (sel) => {
    if (!sel.includes("[data-part~=")) return false;
    // eslint-disable-next-line sonarjs/slow-regex -- runs on this repo's own CSS selectors, never on untrusted input
    const masked = sel.replace(/\[[^\]]*\]/g, (m) =>
      m.replace(/[\s>+~]/g, "_"),
    );
    const compounds = masked.trim().split(/[\s>+~]+/);
    const subject = compounds.at(-1) ?? "";
    if (/::|:(before|after)\b/.test(subject)) return false;
    if (subject.includes("[data-part")) return true;
    if (masked.trim().startsWith('[data-part_="doc-body"]')) return false;
    const tag = /^[a-z][a-z0-9]*/.exec(subject)?.[0];
    return subject.startsWith("*") || (tag !== undefined && BANNED.has(tag));
  };
  const listed = exceptions();
  /* @type {Set<string>} */
  const matched = new Set();
  const norm = (/* @type {string} */ s) => s.replace(/\s+/g, " ").trim();
  let found = 0;
  for (const { file, text } of cssFiles()) {
    postcss.parse(text, { from: file }).walkRules((rule) => {
      const hit = rule.selectors.filter(
        (s) =>
          checked(s) &&
          (only.size === 0 ||
            [...only].some((t) => s.includes(`[data-part~="${t}"]`))),
      );
      if (hit.length === 0) return;
      rule.each((node) => {
        const bad =
          (node.type === "decl" && SPACING.test(node.prop)) ||
          (node.type === "atrule" &&
            node.name === "apply" &&
            applySpacing(node.params));
        if (!bad) return;
        const prev = node.prev();
        const id =
          prev?.type === "comment"
            ? /^spacing-exception: (E\d+)$/.exec(prev.text.trim())?.[1]
            : undefined;
        const row = id === undefined ? undefined : listed.get(id);
        const media =
          rule.parent?.type === "atrule" && rule.parent.name === "media"
            ? norm(rule.parent.params)
            : "";
        if (
          id !== undefined &&
          row !== undefined &&
          row.file === file &&
          media.includes("max-width") &&
          media === norm(row.media) &&
          norm(rule.selector) === norm(row.selector) &&
          norm(node.toString()) === norm(row.decl)
        ) {
          matched.add(id);
          return;
        }
        found += 1;
        const note =
          id === undefined
            ? ""
            : ` (comment ${id} does not match a listed exception)`;
        console.log(
          `spacing ${file}:${String(node.source?.start?.line ?? 0)} ${hit.join(", ")} { ${node.toString()} }${note}`,
        );
      });
    });
  }
  if (only.size === 0)
    for (const id of listed.keys())
      if (!matched.has(id)) {
        found += 1;
        console.log(`unmatched-exception ${id}`);
      }
  console.log(`exceptions=${String(matched.size)}`);
  console.log(`spacing=${String(found)}`);
  ok = found === 0;
} else if (mode === "locators") {
  const spec = readFileSync(join(repoRoot, "e2e-site/site.spec.ts"), "utf8");
  const ids = new Set(
    [
      ...spec.matchAll(
        /getByTestId\(\s*["'`]([\w-]+)["'`]|data-testid=\\?["']([\w-]+)/g,
      ),
    ].map((m) => m[1] ?? m[2] ?? ""),
  );
  const src = walk(srcRoot)
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");
  for (const id of ids) {
    const hit = new RegExp(`data-testid=\\\\?["']${id}\\\\?["']`).test(src);
    if (!hit) ok = false;
    console.log(`${hit ? "ok" : "missing"} ${id}`);
  }
  const reveal = readFileSync(join(srcRoot, "lib/use-reveal.ts"), "utf8");
  const revealOk =
    /setAttribute\(\s*"data-reveal-state",\s*"pending"/.test(reveal) &&
    /setAttribute\(\s*"data-reveal-state",\s*"done"/.test(reveal);
  if (!revealOk) ok = false;
  console.log(`${revealOk ? "ok" : "missing"} reveal-state`);
  console.log(`locators=${String(ids.size)}`);
  if (ids.size === 0) ok = false;
} else {
  console.error(
    "usage: ui-audit.mjs jsx [file...] | classes <file...> | refs <class...> | parts | spacing [token...] | locators",
  );
  process.exit(2);
}
process.exit(ok ? 0 : 1);
