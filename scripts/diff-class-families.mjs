#!/usr/bin/env node
/**
 * DEV.7 class-family diff: which utility families the baseline CSS had that
 * the proxy CSS no longer has.
 *
 * Usage:
 *   node scripts/diff-class-families.mjs <baseline-classes.txt> <css file|dir> \
 *     [--allow <allowlist.txt>] [--all] [--list-classes]
 *
 * A directory is walked recursively and every `.css` file in it is read
 * (Next emits `.next/static/css/*.css`).
 *
 * Family = the utility prefix before the token value, with variants split
 * into their own column:
 *   `md:hover:rounded-t-lg` -> family `rounded-t-`, variants `md`, `hover`
 *   `bg-primary`            -> `bg-`
 *   `sp-top`                -> `sp-`
 *   `flex` (no value)       -> `flex`
 * Directional/axis segments (`t`, `x`, ...) and `min`/`max` stay part of the
 * family (`rounded-t-`, `translate-x-`, `min-h-`).
 *
 * Exit codes: 0 = no family missing (or every missing one is allowlisted),
 * 1 = a baseline family is absent from the proxy and not allowlisted,
 * 2 = usage / unreadable input / malformed allowlist.
 *
 * Allowlist lines: `key | reason | replacement` (all three non-empty);
 * blank lines and `#` comments are ignored. `key` is either a family
 * (`content-`: the whole family may be absent) or a `variant:family` pair
 * (`md:text-`: only that variant of a family that is otherwise present may be
 * absent). Prefer pairs: allowlisting a present family (`text-`) would hide the
 * loss of token-driven utilities such as `text-primary`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const flagValue = (name) => {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : undefined;
};
const positional = args.filter(
  (a, i) => !a.startsWith("--") && args[i - 1] !== "--allow",
);
const [baselinePath, cssPath] = positional;
const allowPath = flagValue("--allow");
const showAll = args.includes("--all");
const listClasses = args.includes("--list-classes");

if (!baselinePath || !cssPath || (args.includes("--allow") && !allowPath)) {
  console.error(
    "Usage: diff-class-families.mjs <baseline-classes.txt> <css file|dir> [--allow <allowlist.txt>] [--all] [--list-classes]",
  );
  process.exit(2);
}

function readOrExit(path) {
  try {
    return readFileSync(resolve(path), "utf8");
  } catch (error) {
    console.error(
      `Cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(2);
  }
}

/** Concatenated text of a css file, or of every `.css` file under a directory. */
function readCssInput(path) {
  const abs = resolve(path);
  let stat;
  try {
    stat = statSync(abs);
  } catch (error) {
    console.error(
      `Cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(2);
  }
  if (!stat.isDirectory()) return readOrExit(abs);
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        return entry.name.endsWith(".css") ? [full] : [];
      });
  const files = walk(abs);
  if (files.length === 0) {
    console.error(`No .css files found under ${path}`);
    process.exit(2);
  }
  return files.map((f) => readOrExit(f)).join("\n");
}

/** Split on `sep` only outside `[...]` (arbitrary values/variants may contain it). */
function splitTopLevel(text, sep) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "[") depth++;
    else if (ch === "]") depth = Math.max(0, depth - 1);
    if (ch === sep && depth === 0) {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  parts.push(current);
  return parts;
}

const DIRECTION = new Set([
  "t",
  "r",
  "b",
  "l",
  "x",
  "y",
  "s",
  "e",
  "tl",
  "tr",
  "bl",
  "br",
  "ss",
  "se",
  "es",
  "ee",
]);
const TWO_PART_LEADS = new Set(["min", "max"]);

/** @returns {{ family: string, variants: string[] }} */
function classify(className) {
  const pieces = splitTopLevel(className, ":");
  const rawBase = pieces.pop() ?? "";
  const variants = pieces;
  const base = rawBase.replace(/^!+|!+$/g, "").replace(/^-/, "");
  if (base.startsWith("[")) return { family: "[arbitrary-property]", variants };

  // Cut an arbitrary value (`top-[14px]`, `w-[calc(1-2)]`) before segmenting.
  const bracket = base.indexOf("[");
  const bare = bracket >= 0 ? base.slice(0, bracket) : base;
  const hadValueTail = bracket >= 0;
  const segments = bare.split("-").filter(Boolean);
  const lead = segments[0] ?? base;
  if (segments.length === 1 && !hadValueTail) return { family: lead, variants };

  let family = `${lead}-`;
  const second = segments[1];
  if (second !== undefined) {
    if (DIRECTION.has(second) || TWO_PART_LEADS.has(lead))
      family = `${lead}-${second}-`;
  }
  return { family, variants };
}

/** Class names appearing in selector preludes (declaration values are ignored). */
function classesFromCss(css) {
  const found = new Set();
  const source = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let start = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") {
      const prelude = source.slice(start, i).trim();
      start = i + 1;
      if (prelude.startsWith("@")) continue;
      for (const m of prelude.matchAll(
        /\.((?:\\[0-9a-fA-F]{1,6}\s?|\\.|[A-Za-z0-9_-])+)/g,
      )) {
        found.add(
          m[1]
            .replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex) =>
              String.fromCodePoint(parseInt(hex, 16)),
            )
            .replace(/\\(.)/g, "$1"),
        );
      }
    } else if (ch === "}" || ch === ";") start = i + 1;
  }
  return found;
}

function parseAllowlist(text, path) {
  const entries = new Map();
  const errors = [];
  text.split("\n").forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const fields = trimmed.split("|").map((f) => f.trim());
    if (fields.length !== 3 || fields.some((f) => f === "")) {
      errors.push(
        `${path}:${idx + 1}: expected "family | reason | replacement" with all three non-empty`,
      );
      return;
    }
    entries.set(fields[0], { reason: fields[1], replacement: fields[2] });
  });
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(2);
  }
  return entries;
}

/** @param {Iterable<string>} classNames */
function groupByFamily(classNames) {
  const families = new Map();
  for (const name of classNames) {
    const { family, variants } = classify(name);
    const entry = families.get(family) ?? {
      classes: new Set(),
      variants: new Set(),
    };
    entry.classes.add(name);
    for (const v of variants) entry.variants.add(v);
    families.set(family, entry);
  }
  return families;
}

const baselineClasses = readOrExit(baselinePath)
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);
const proxyClasses = classesFromCss(readCssInput(cssPath));
const allow = allowPath
  ? parseAllowlist(readOrExit(allowPath), allowPath)
  : new Map();

const baselineFamilies = groupByFamily(baselineClasses);
const proxyFamilies = groupByFamily(proxyClasses);

const rows = [...baselineFamilies.entries()]
  .map(([family, entry]) => ({
    family,
    baseline: entry.classes.size,
    proxy: proxyFamilies.get(family)?.classes.size ?? 0,
    variants: [...entry.variants].sort().join(", "),
  }))
  .sort((a, b) => a.family.localeCompare(b.family));

const missing = rows.filter((r) => r.proxy === 0);
const unallowed = missing.filter((r) => !allow.has(r.family));
const allowed = missing.filter((r) => allow.has(r.family));

const table = (list) => {
  const w = Math.max(6, ...list.map((r) => r.family.length));
  console.log(
    `${"family".padEnd(w)}  baseline  proxy  variants(baseline)\n${"-".repeat(w)}  --------  -----  ------------------`,
  );
  for (const r of list) {
    console.log(
      `${r.family.padEnd(w)}  ${String(r.baseline).padStart(8)}  ${String(r.proxy).padStart(5)}  ${r.variants}`,
    );
  }
};

console.log(
  `baseline: ${baselineClasses.length} classes / ${baselineFamilies.size} families; proxy: ${proxyClasses.size} classes / ${proxyFamilies.size} families`,
);
if (showAll) {
  console.log("");
  table(rows);
}

const absentClasses = baselineClasses.filter((c) => !proxyClasses.has(c));
console.log(
  `baseline classes absent from proxy: ${absentClasses.length} (${new Set(absentClasses.map((c) => classify(c).family)).size} families touched)`,
);
if (listClasses) for (const c of absentClasses) console.log(`  - ${c}`);

if (allowed.length) {
  console.log("\nMissing but allowlisted:");
  for (const r of allowed) {
    const a = allow.get(r.family);
    console.log(
      `  ${r.family} (${r.baseline} classes) — ${a.reason} -> ${a.replacement}`,
    );
  }
}

// Variants are a separate column: a family that still exists but lost a
// variant the baseline used (e.g. `hover:bg-`) is a regression too.
const variantPairs = (classNames) => {
  const pairs = new Map();
  for (const name of classNames) {
    const { family, variants } = classify(name);
    for (const variant of variants)
      pairs.set(`${variant}\u0000${family}`, { family, variant });
  }
  return pairs;
};
const proxyPairs = variantPairs(proxyClasses);
const lostPairs = [...variantPairs(baselineClasses).entries()]
  .filter(
    ([key, { family }]) => !proxyPairs.has(key) && proxyFamilies.has(family),
  )
  .map(([, pair]) => pair);
const missingPairs = lostPairs.filter(
  ({ variant, family }) =>
    !allow.has(family) && !allow.has(`${variant}:${family}`),
);

const stale = [...allow.keys()].filter((key) =>
  key.includes(":")
    ? !lostPairs.some(({ variant, family }) => `${variant}:${family}` === key)
    : !missing.some((r) => r.family === key),
);
if (stale.length) {
  console.log(
    `\nNote: allowlist entries with no missing family (can be removed): ${stale.join(", ")}`,
  );
}

if (missingPairs.length) {
  console.log("\nMISSING variant x family pairs (not allowlisted):");
  for (const { variant, family } of missingPairs)
    console.log(`  ${variant}: ${family}`);
}
if (unallowed.length) {
  console.log("\nMISSING families (not allowlisted):");
  table(unallowed);
}
if (unallowed.length || missingPairs.length) process.exit(1);
console.log(
  "\nOK: no baseline family (or variant x family pair) missing from the proxy.",
);
