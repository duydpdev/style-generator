import { gzipSync } from "node:zlib";

import type { ResolvedOptions } from "../core/resolveOptions";
import type { ThemeConfig } from "../core/themeSchema";
import { builtInCategories } from "../features/registry/builtInCategories";
import { defaultKeysOf } from "../features/registry/categoryTokenMeta";
import type { TokenCategoryDescriptor } from "../features/registry/TokenCategoryDescriptor";
import { toKebabCase } from "../shared/helpers";

/** A theme class group: one registry category and one class prefix (`""` for typography). */
export interface CoverageGroup {
  category: string;
  prefix: string;
}

/**
 * The printable id of a group: `<category>/<prefix>`, or the bare category.
 * @param {CoverageGroup} g - The group
 * @returns {string} `"colors/ring"`, `"typography"`
 */
export const groupId = (g: CoverageGroup): string =>
  g.prefix === "" ? g.category : `${g.category}/${g.prefix}`;

/**
 * Maps every class the theme's tokens can produce to its group; an omitted or
 * empty category uses its `defaultValues` keys, like `generateSourceInline`.
 * @param {ThemeConfig} theme - A theme that already passed `ThemeSchema`
 * @returns {Map<string, CoverageGroup>} Class name (`ring-primary`) to group
 */
export function themeClassGroups(
  theme: ThemeConfig,
): Map<string, CoverageGroup> {
  const map = new Map<string, CoverageGroup>();
  for (const cat of builtInCategories) {
    const d: TokenCategoryDescriptor = cat;
    const own = Object.keys(theme[cat.key] ?? {});
    const keys = own.length > 0 ? own : defaultKeysOf(d.defaultValues);
    for (const prefix of d.classPrefixes ?? []) {
      const group = { category: cat.key, prefix };
      for (const key of keys) {
        const kebab = toKebabCase(key);
        map.set(prefix === "" ? kebab : `${prefix}-${kebab}`, group);
      }
    }
  }
  return map;
}

const NAME = /(?:\\[0-9a-f]{1,6} ?|\\[\s\S]|[\w-]|[\u0080-\uffff])*/iy;

const unescape = (raw: string): string =>
  raw.replace(
    /\\([0-9a-f]{1,6}) ?|\\([\s\S])/gi,
    (_m, hex: string | undefined, ch: string | undefined) => {
      if (hex === undefined) return ch ?? "";
      const code = parseInt(hex, 16);
      return code > 0x10ffff ? "\ufffd" : String.fromCodePoint(code);
    },
  );

const stripVariants = (name: string): string => {
  let depth = 0;
  let cut = 0;
  for (let k = 0; k < name.length; k++) {
    const c = name.charAt(k);
    if (c === "[") depth++;
    else if (c === "]") depth = Math.max(0, depth - 1);
    else if (c === ":" && depth === 0) cut = k + 1;
  }
  return name.slice(cut);
};

/**
 * The first class outside `[...]`, unescaped, without variants, `!` and a `/<n>` step.
 * @param {string} selector - One selector (no top-level comma)
 * @returns {string | undefined} The class, or `undefined` when there is none
 */
export function selectorClass(selector: string): string | undefined {
  let i = 0;
  let bracket = 0;
  while (i < selector.length) {
    const c = selector.charAt(i);
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === "." && bracket === 0) {
      NAME.lastIndex = i + 1;
      const raw = NAME.exec(selector)?.[0] ?? "";
      return (
        stripVariants(unescape(raw))
          .replace(/^!|!$/g, "")
          .replace(/\/\d+$/, "") || undefined
      );
    }
    if (c === "[") bracket++;
    else if (c === "]" && bracket > 0) bracket--;
    i++;
  }
  return undefined;
}

const skipString = (css: string, start: number): number => {
  const quote = css.charAt(start);
  let i = start + 1;
  while (i < css.length) {
    const c = css.charAt(i);
    if (c === "\\") i += 2;
    else if (c === quote) return i + 1;
    else i++;
  }
  return i;
};

const skipComment = (css: string, i: number): number => {
  const end = css.indexOf("*/", i + 2);
  return end < 0 ? css.length : end + 2;
};

/**
 * Splits a selector list on the commas at depth 0 (not inside `()`, `[]` or strings).
 * @param {string} prelude - A rule prelude
 * @returns {string[]} The selectors, untrimmed
 */
export function splitSelectorList(prelude: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < prelude.length) {
    const c = prelude.charAt(i);
    if (c === "\\") i += 2;
    else if (c === '"' || c === "'") i = skipString(prelude, i);
    else {
      if (c === "(" || c === "[") depth++;
      else if (c === ")" || c === "]") depth--;
      else if (c === "," && depth === 0) {
        out.push(prelude.slice(start, i));
        start = i + 1;
      }
      i++;
    }
  }
  out.push(prelude.slice(start));
  return out;
}

// Index just past the `}` closing the `{` at `open`, or the text length.
const blockEnd = (css: string, open: number): number => {
  let depth = 0;
  let i = open;
  while (i < css.length) {
    const c = css.charAt(i);
    if (c === '"' || c === "'") i = skipString(css, i);
    else if (c === "/" && css.charAt(i + 1) === "*") i = skipComment(css, i);
    else if (c === "\\") i += 2;
    else {
      if (c === "{") depth++;
      else if (c === "}" && --depth === 0) return i + 1;
      i++;
    }
  }
  return css.length;
};

// One prelude or declaration: its end index and terminator (`{`, `;` or `""` at the end).
const readPrelude = (css: string, start: number): [number, string] => {
  let i = start;
  let paren = 0;
  while (i < css.length) {
    const c = css.charAt(i);
    if (c === '"' || c === "'") i = skipString(css, i);
    else if (c === "/" && css.charAt(i + 1) === "*") i = skipComment(css, i);
    else if (c === "\\") i += 2;
    else {
      if (c === "(" || c === "[") paren++;
      else if (c === ")" || c === "]") paren--;
      else if (paren <= 0 && (c === "{" || c === ";")) return [i, c];
      i++;
    }
  }
  return [css.length, ""];
};

const UNTOUCHED = /^@(?:property|keyframes|font-face)\b/;

/**
 * Removes every rule whose selectors all have a member class, nested rules
 * included; at-rules are searched, never removed; `@property`, `@keyframes`
 * and `@font-face` are copied untouched.
 * @param {string} css - Flat (minified) or nested CSS
 * @param {(cls: string) => boolean} isMember - Whether a class is in the group
 * @returns {{ css: string; removed: number }} The remaining CSS and the removed rule count
 */
export function stripGroupRules(
  css: string,
  isMember: (cls: string) => boolean,
): { css: string; removed: number } {
  let removed = 0;
  const run = (src: string): string => {
    let out = "";
    let i = 0;
    while (i < src.length) {
      const start = i;
      const [end, term] = readPrelude(src, i);
      if (term !== "{") {
        out += src.slice(start, end + 1);
        i = end + 1;
        continue;
      }
      const close = blockEnd(src, end);
      const prelude = src.slice(start, end);
      const clean = prelude.replace(/\/\*[\s\S]*?\*\//g, "").trim();
      const body = src.slice(
        end + 1,
        src.charAt(close - 1) === "}" ? close - 1 : close,
      );
      i = close;
      if (clean.startsWith("@")) {
        if (UNTOUCHED.test(clean)) {
          out += src.slice(start, close);
          continue;
        }
      } else if (
        splitSelectorList(clean).every((s) => {
          const cls = selectorClass(s.trim());
          return cls !== undefined && isMember(cls);
        })
      ) {
        removed++;
        continue;
      }
      out += `${prelude}{${run(body)}}`;
    }
    return out;
  };
  return { css: run(css), removed };
}

const gzipSize = (css: string): number => gzipSync(css).length;

/**
 * Marginal gzip cost per group: the sum over files of `gzip(css) − gzip(css without the group)`.
 * @param {readonly { file: string; css: string }[]} files - The built CSS files
 * @param {Map<string, CoverageGroup>} groups - From `themeClassGroups`
 * @returns {{ group: CoverageGroup; bytes: number; rules: number }[]} Groups with at least one rule, by bytes descending then id
 */
export function coverageCost(
  files: readonly { file: string; css: string }[],
  groups: Map<string, CoverageGroup>,
): { group: CoverageGroup; bytes: number; rules: number }[] {
  const ids = new Map<string, CoverageGroup>();
  for (const g of groups.values()) ids.set(groupId(g), g);
  const result: { group: CoverageGroup; bytes: number; rules: number }[] = [];
  for (const [id, group] of ids) {
    let bytes = 0;
    let rules = 0;
    for (const { css } of files) {
      const r = stripGroupRules(css, (cls) => {
        const g = groups.get(cls);
        return g !== undefined && groupId(g) === id;
      });
      rules += r.removed;
      if (r.removed > 0) bytes += gzipSize(css) - gzipSize(r.css);
    }
    if (rules > 0) result.push({ group, bytes, rules });
  }
  return result.sort(
    (a, b) =>
      b.bytes - a.bytes || groupId(a.group).localeCompare(groupId(b.group)),
  );
}

/**
 * The `coverage` setting that removes a group's `@source inline` classes; an
 * opacity group listing the prefix itself keeps emitting it, so it is named.
 * @param {CoverageGroup} group - The group
 * @param {ResolvedOptions} resolved - The project's options through `resolveOptions`
 * @returns {string} The setting, or why the classes already come from the app's source
 */
export function suggestCoverage(
  group: CoverageGroup,
  resolved: ResolvedOptions,
): string {
  const cat = group.category;
  const rule = resolved.coverage[cat];
  if (rule?.enabled === false) {
    return `coverage.${cat} is already false`;
  }
  const d: TokenCategoryDescriptor | undefined = builtInCategories.find(
    (c) => c.key === cat,
  );
  const current = rule?.prefixes ?? d?.classPrefixes ?? [];
  const own = (rule?.opacityGroups ?? [])
    .filter((g) => g.prefixes?.includes(group.prefix))
    .map((g) => String(g.index));
  const note =
    own.length === 0 ? "" : ` (opacity group ${own.join(", ")} still adds it)`;
  if (!current.includes(group.prefix)) {
    return `already out of coverage${note}`;
  }
  const remaining = current.filter((p) => p !== group.prefix);
  if (remaining.length === 0 || d?.bareClassName === true) {
    return `coverage.${cat}: false`;
  }
  return `coverage.${cat}.prefixes: ${JSON.stringify(remaining)}${note}`;
}
