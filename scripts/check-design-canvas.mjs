/**
 * `node scripts/check-design-canvas.mjs`: the one-theme rule for a design
 * canvas (a folder of `*.dc.html` artboards plus their stylesheets).
 *
 * Every artboard reads its tokens from ONE theme, the one `--theme` names:
 * - the only custom properties read or declared are the generated `--sg-*`
 *   variables plus `--spacing`, `--tw-*` and `--layout-*`; any other name
 *   (`--bl-ink`, `--muted`, …) is a second token namespace;
 * - every `var(--sg-<prefix>-<key>)` names a token the theme produces
 *   (`--sg-sp-*` spacing variables are always allowed);
 * - text sizes come from typography classes: no `font-size:` other than
 *   `inherit` (lengths and `{{binding}}` values alike) and no `font:`
 *   shorthand other than `font: inherit`;
 * - no artboard loads a `/_blob/` stylesheet or links a `/_blob/` file, both
 *   of which live outside the theme;
 * - with `--stamp`, the design system was built from these theme bytes; with
 *   `--intents`, every `*.Button` `color` is one of those variant names.
 *
 * Scanned: every `*.dc.html` and `*.css` under `--canvas`, recursively, except
 * `node_modules` and the two files a design-system producer writes
 * (`ds/<namespace>/tokens.css`, `ds/<namespace>/components/bundle.css`).
 *
 * `--inventory` prints what the canvas uses (JSON) instead of checking it.
 * Node built-ins plus the built `dist/cva.js` (`toKebabCase`).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { toKebabCase } from "../dist/cva.js";

/**
 * @typedef {object} FontSize
 * @property {string} file - Path relative to the canvas dir (POSIX)
 * @property {number} line - 1-based line
 * @property {string} value - Declared value, trimmed
 * @property {"px" | "binding" | "other"} kind - A length, a `{{name}}` binding, or anything else
 * @property {string[]} literals - For a binding: the `'<N>px'` strings the file's script assigns to that name
 * @property {string | null} weight - `font-weight` of the same declaration block
 * @property {string | null} lineHeight - `line-height` of the same declaration block
 * @property {string | null} family - `font-family` of the same declaration block
 * @property {string | null} text - First 40 characters of the element's text, for a `style` attribute
 */

/**
 * @typedef {object} Located
 * @property {string} file - Path relative to the canvas dir (POSIX)
 * @property {number} line - 1-based line
 * @property {string} value - The recorded value
 */

/**
 * @typedef {object} Inventory
 * @property {number} files - Scanned files
 * @property {Record<string, number>} vars - Non-`--sg-*` custom properties read or declared
 * @property {Record<string, number>} varText - Other `--bl-…` text (labels, samples, strings), by file
 * @property {Record<string, number>} sgVars - `var(--sg-…)` reads
 * @property {Record<string, number>} blClasses - `bl-*` class names in `class="…"`
 * @property {Record<string, number>} blobLinks - `<link rel="stylesheet" href="/_blob/<id>">`, by id
 * @property {Record<string, number>} blobRefs - Any other `href="/_blob/<id>"`, by id
 * @property {FontSize[]} fontSizes - Every `font-size:` declaration
 * @property {Record<string, number>} dsGlobals - `component-from-global-scope` values
 * @property {string[]} dsPaths - Sorted unique `ds/…` references
 * @property {Located[]} fontShorthands - Every `font:` declaration
 * @property {Located[]} intents - Every `*.Button` `color`, bindings expanded to their literals
 */

/**
 * @typedef {object} Occurrence
 * @property {string} file - Path relative to the canvas dir (POSIX)
 * @property {number} line - 1-based line
 * @property {"var" | "varText" | "sgVar" | "blobLink" | "blobRef"} kind - What was found
 * @property {string} value - Variable name, text excerpt or blob id
 */

/**
 * @typedef {object} ScannedFile
 * @property {string} file - Path relative to the canvas dir (POSIX)
 * @property {Occurrence[]} occurrences - Variables, `--bl-` text and blob references
 * @property {string[]} blClasses - `bl-*` class names, one entry per use
 * @property {FontSize[]} fontSizes - `font-size:` declarations
 * @property {Located[]} fontShorthands - `font:` declarations
 * @property {string[]} dsGlobals - `component-from-global-scope` values, one per use
 * @property {string[]} dsPaths - `ds/…` references
 * @property {Located[]} intents - Button `color` values
 */

/** Custom properties that are not a second token namespace. */
const ALLOWED_VAR = /^--(?:sg-|tw-|layout-)|^--spacing$/;

/** Theme category → the `--<prefix>-<key>` its tokens are emitted under. */
const CATEGORY_PREFIXES = /** @type {const} */ ([
  ["colors", "sg-color"],
  ["shadows", "sg-shadow"],
  ["borderRadius", "sg-radius"],
  ["fontFamily", "sg-font"],
  ["backdropBlurs", "sg-backdrop-blur"],
  ["borderWidth", "sg-border-width"],
]);

/** Files a design-system producer writes; they declare the theme's own aliases. */
const PRODUCER_FILES = [
  /(?:^|\/)ds\/[^/]+\/tokens\.css$/,
  /(?:^|\/)ds\/[^/]+\/components\/bundle\.css$/,
];

/**
 * Every scanned file under `dir`, as sorted POSIX paths relative to `dir`.
 * @param {string} dir - Canvas directory
 * @returns {string[]} Sorted paths
 */
export function canvasFiles(dir) {
  /** @type {string[]} */
  const out = [];
  /** @param {string} at - Directory to read */
  const walk = (at) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const full = join(at, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(full);
        continue;
      }
      if (!/\.(?:dc\.html|css)$/.test(entry.name)) continue;
      const rel = relative(dir, full).split(sep).join("/");
      if (PRODUCER_FILES.some((re) => re.test(rel))) continue;
      out.push(rel);
    }
  };
  walk(dir);
  return out.sort();
}

/**
 * Maps a string index to its 1-based line.
 * @param {string} text - File contents
 * @returns {(index: number) => number} Lookup from index to line
 */
function lineIndex(text) {
  /** @type {number[]} */
  const starts = [0];
  for (let i = 0; i < text.length; i++)
    if (text[i] === "\n") starts.push(i + 1);
  return (index) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((starts[mid] ?? 0) <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

const QUOTES = "'\"`";
const OPENERS = "([{";
const CLOSERS = ")]}";
const TERMINATORS = ",;\n";

/**
 * Where the expression starting at `start` ends: a top-level `,`, `;`,
 * newline or unmatched closing bracket, else the end of the script.
 * @param {string} script - Script source
 * @param {number} start - Index of the expression's first character
 * @returns {number} Index one past the expression
 */
function expressionEnd(script, start) {
  let depth = 0;
  /** @type {string | null} */
  let quote = null;
  for (let i = start; i < script.length; i++) {
    const ch = script[i] ?? "";
    if (quote !== null) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
    } else if (QUOTES.includes(ch)) quote = ch;
    else if (OPENERS.includes(ch)) depth++;
    else if (depth === 0 && (CLOSERS + TERMINATORS).includes(ch)) return i;
    else if (CLOSERS.includes(ch)) depth--;
  }
  return script.length;
}

/**
 * The expression assigned to `name` (`name: expr` or `name = expr`), ending at
 * a top-level `,`, `;`, closing bracket or newline.
 * @param {string} script - Script source
 * @param {string} name - Key or variable name
 * @returns {string[]} Every assigned expression
 */
function assignedExpressions(script, name) {
  const escaped = name.replace(/[$]/g, "\\$&");
  const re = new RegExp(`(?<![\\w$])${escaped}['"]?\\s*(?::|=(?![=>]))`, "g");
  return [...script.matchAll(re)].map((match) => {
    const start = match.index + match[0].length;
    return script.slice(start, expressionEnd(script, start));
  });
}

/**
 * Quoted string literals the file's `<script>` blocks assign to `name`, in
 * order, without duplicates.
 * @param {string} text - File contents
 * @param {string} name - Binding name (`h1`, `s.h1` → `h1`)
 * @param {RegExp} literal - Which literals count (must have one capture group)
 * @returns {string[]} Matching literals
 */
function boundLiterals(text, name, literal) {
  const key = name.split(".").pop() ?? name;
  /** @type {string[]} */
  const out = [];
  for (const block of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const expr of assignedExpressions(block[1] ?? "", key)) {
      for (const lit of expr.matchAll(literal)) {
        const value = lit[1] ?? "";
        if (!out.includes(value)) out.push(value);
      }
    }
  }
  return out;
}

const PX_LITERAL = /['"`](\d+(?:\.\d+)?px)['"`]/g;
const ANY_LITERAL = /['"`]([^'"`\n]*)['"`]/g;
const BINDING = /^\{\{\s*([\w$.]+)\s*\}\}$/;

/**
 * `font-weight`/`line-height`/`font-family` of a declaration block.
 * @param {string} block - Declarations
 * @param {string} property - Property name
 * @returns {string | null} Trimmed value, or null when absent
 */
function blockValue(block, property) {
  const match = new RegExp(`(?<![\\w-])${property}\\s*:\\s*([^;}"]+)`).exec(
    block,
  );
  return match ? (match[1] ?? "").trim() : null;
}

/** @typedef {(index: number) => number} LineOf */

/**
 * Custom properties read (`var(--x)`) or declared (`--x:`), then any other
 * `--bl-` text.
 * @param {string} file - Path relative to the canvas dir (POSIX)
 * @param {string} text - File contents
 * @param {LineOf} lineOf - Index to line
 * @returns {Occurrence[]} In that order
 */
function collectVars(file, text, lineOf) {
  /** @type {Occurrence[]} */
  const out = [];
  /** @type {Set<number>} */
  const varStarts = new Set();
  for (const m of text.matchAll(/var\(\s*(--[A-Za-z_][\w-]*)/g)) {
    const name = m[1] ?? "";
    const at = m.index + m[0].indexOf(name);
    varStarts.add(at);
    const kind = name.startsWith("--sg-") ? "sgVar" : "var";
    out.push({ file, line: lineOf(at), kind, value: name });
  }
  for (const m of text.matchAll(/(?<![\w-])(--[A-Za-z_][\w-]*)\s*:/g)) {
    const name = m[1] ?? "";
    if (name.startsWith("--sg-") || varStarts.has(m.index)) continue;
    varStarts.add(m.index);
    out.push({ file, line: lineOf(m.index), kind: "var", value: name });
  }
  for (const m of text.matchAll(/(?<![\w-])--bl-[^\s"'<>;,)]*/g)) {
    if (varStarts.has(m.index)) continue;
    const value = text.slice(m.index, m.index + 30).split("\n")[0] ?? "";
    out.push({ file, line: lineOf(m.index), kind: "varText", value });
  }
  return out;
}

/**
 * `/_blob/` stylesheets, then every other `/_blob/` link.
 * @param {string} file - Path relative to the canvas dir (POSIX)
 * @param {string} text - File contents
 * @param {LineOf} lineOf - Index to line
 * @returns {Occurrence[]} In that order
 */
function collectBlobs(file, text, lineOf) {
  /** @type {Occurrence[]} */
  const out = [];
  /** @type {Set<number>} */
  const stylesheetHrefs = new Set();
  for (const tag of text.matchAll(/<link\b[^>]*>/gi)) {
    const rel = /\brel\s*=\s*["']([^"']*)["']/i.exec(tag[0]);
    const href = /\bhref\s*=\s*["']\/_blob\/([\w-]+)["']/i.exec(tag[0]);
    if (!rel || !href || !/\bstylesheet\b/i.test(rel[1] ?? "")) continue;
    const at = tag.index + href.index;
    stylesheetHrefs.add(at);
    out.push({
      file,
      line: lineOf(at),
      kind: "blobLink",
      value: href[1] ?? "",
    });
  }
  for (const m of text.matchAll(/\bhref\s*=\s*["']\/_blob\/([\w-]+)["']/gi)) {
    if (stylesheetHrefs.has(m.index)) continue;
    out.push({
      file,
      line: lineOf(m.index),
      kind: "blobRef",
      value: m[1] ?? "",
    });
  }
  return out;
}

/**
 * `bl-*` class names, one entry per use: in `class="…"`, and in string
 * literals of `<script>` blocks, which bind a class at runtime
 * (`frost: sc ? 'bl-frost' : ''`).
 * @param {string} text - File contents
 * @returns {string[]} Class names
 */
function collectBlClasses(text) {
  const attributes = [...text.matchAll(/\bclass\s*=\s*(["'])([^"']*)\1/g)];
  const scripts = [...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  // Only a literal that is nothing but class names counts: a CSS code sample
  // in a string (`'.bl-x { animation: bl-pulse 1s }'`) is content.
  const classLists = scripts
    .flatMap((s) => [...(s[1] ?? "").matchAll(ANY_LITERAL)])
    .map((m) => m[1] ?? "")
    .filter((value) => /^[\w\s-]*$/.test(value));
  return [...attributes.map((m) => m[2] ?? ""), ...classLists].flatMap(
    (value) => value.split(/\s+/).filter((name) => /^bl-[\w-]+$/.test(name)),
  );
}

/** @typedef {{ start: number, end: number, value: string }} StyleAttr */

/**
 * Every `style="…"` attribute with the range of its value.
 * @param {string} text - File contents
 * @returns {StyleAttr[]} In document order
 */
function styleAttributes(text) {
  return [...text.matchAll(/\bstyle\s*=\s*"([^"]*)"/g)].map((m) => {
    const value = m[1] ?? "";
    const start = m.index + m[0].indexOf('"') + 1;
    return { start, end: start + value.length, value };
  });
}

/**
 * The declaration block around `index`, and the element text when it is a
 * `style` attribute.
 * @param {string} text - File contents
 * @param {StyleAttr[]} styleAttrs - From `styleAttributes(text)`
 * @param {number} index - Position of the declaration
 * @returns {{ block: string, text: string | null }} Block and element text
 */
function declarationContext(text, styleAttrs, index) {
  const attr = styleAttrs.find((a) => index >= a.start && index < a.end);
  if (attr) {
    const close = text.indexOf(">", attr.end);
    const after = close === -1 ? "" : text.slice(close + 1, close + 1 + 400);
    const plain = after
      // eslint-disable-next-line sonarjs/slow-regex -- the input is a slice of at most 400 characters
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { block: attr.value, text: plain.slice(0, 40) };
  }
  const open = text.lastIndexOf("{", index);
  const close = text.indexOf("}", index);
  const end = close === -1 ? text.length : close;
  return { block: text.slice(open + 1, end), text: null };
}

/**
 * @param {string} value - Declared `font-size` value
 * @param {boolean} isBinding - Whether the value is a `{{name}}` binding
 * @returns {FontSize["kind"]} The value's kind
 */
function fontSizeKind(value, isBinding) {
  if (isBinding) return "binding";
  return /^(?:\d+(?:\.\d+)?|\.\d+)px$/.test(value) ? "px" : "other";
}

/**
 * Every `font-size:` declaration.
 * @param {string} file - Path relative to the canvas dir (POSIX)
 * @param {string} text - File contents
 * @param {LineOf} lineOf - Index to line
 * @returns {FontSize[]} In document order
 */
function collectFontSizes(file, text, lineOf) {
  const styleAttrs = styleAttributes(text);
  const declarations = text.matchAll(
    /(?<![\w-])font-size\s*:\s*(\{\{[^}]*\}\}|[^;"'}<>\n]+)/g,
  );
  return [...declarations].map((m) => {
    const value = (m[1] ?? "").trim();
    const name = BINDING.exec(value)?.[1];
    const context = declarationContext(text, styleAttrs, m.index);
    return {
      file,
      line: lineOf(m.index),
      value,
      kind: fontSizeKind(value, name !== undefined),
      literals: name === undefined ? [] : boundLiterals(text, name, PX_LITERAL),
      weight: blockValue(context.block, "font-weight"),
      lineHeight: blockValue(context.block, "line-height"),
      family: blockValue(context.block, "font-family"),
      text: context.text,
    };
  });
}

/**
 * Every `*.Button` `color`, a binding expanded to the literals assigned to it.
 * @param {string} file - Path relative to the canvas dir (POSIX)
 * @param {string} text - File contents
 * @param {LineOf} lineOf - Index to line
 * @returns {Located[]} In document order
 */
function collectIntents(file, text, lineOf) {
  /** @type {Located[]} */
  const out = [];
  for (const tag of text.matchAll(/<[\w-]+\b[^>]*>/g)) {
    if (!/component-from-global-scope\s*=\s*"[^"]*\.Button"/.test(tag[0]))
      continue;
    const color = /\bcolor\s*=\s*"([^"]*)"/.exec(tag[0]);
    if (!color) continue;
    const line = lineOf(tag.index + color.index);
    const value = color[1] ?? "";
    const name = BINDING.exec(value.trim())?.[1];
    const values =
      name === undefined ? [value] : boundLiterals(text, name, ANY_LITERAL);
    for (const v of values) out.push({ file, line, value: v });
  }
  return out;
}

/**
 * Scans one file's text.
 * @param {string} file - Path relative to the canvas dir (POSIX)
 * @param {string} text - File contents
 * @returns {ScannedFile} Everything the checks and the inventory read
 */
export function scanText(file, text) {
  const lineOf = lineIndex(text);
  return {
    file,
    occurrences: [
      ...collectVars(file, text, lineOf),
      ...collectBlobs(file, text, lineOf),
    ],
    blClasses: collectBlClasses(text),
    fontSizes: collectFontSizes(file, text, lineOf),
    fontShorthands: [
      ...text.matchAll(/(?<![\w-])font\s*:\s*([^;"'}<>\n]+)/g),
    ].map((m) => ({
      file,
      line: lineOf(m.index),
      value: (m[1] ?? "").trim(),
    })),
    dsGlobals: [
      ...text.matchAll(/component-from-global-scope\s*=\s*"([^"]*)"/g),
    ].map((m) => m[1] ?? ""),
    dsPaths: [...text.matchAll(/(?<![\w-])ds\/[^"' )]+/g)].map((m) => m[0]),
    intents: collectIntents(file, text, lineOf),
  };
}

/**
 * @param {string} canvasDir - Canvas directory
 * @returns {ScannedFile[]} One entry per scanned file
 */
function scanCanvas(canvasDir) {
  return canvasFiles(canvasDir).map((file) =>
    scanText(file, readFileSync(join(canvasDir, file), "utf8")),
  );
}

/**
 * @param {Record<string, number>} counts - Counter to update
 * @param {string} key - Key to count once more
 */
function bump(counts, key) {
  counts[key] = (counts[key] ?? 0) + 1;
}

/** Occurrence kind → the inventory counter it feeds. */
const OCCURRENCE_COUNTER = /** @type {const} */ ({
  var: "vars",
  sgVar: "sgVars",
  varText: "varText",
  blobLink: "blobLinks",
  blobRef: "blobRefs",
});

/**
 * What a canvas uses: variables, classes, blob links, font declarations,
 * design-system mounts and button intents.
 * @param {string} canvasDir - Canvas directory
 * @returns {Inventory} Counts and declarations over every scanned file
 */
export function inventoryCanvas(canvasDir) {
  const scanned = scanCanvas(canvasDir);
  /** @type {Inventory} */
  const inv = {
    files: scanned.length,
    vars: {},
    varText: {},
    sgVars: {},
    blClasses: {},
    blobLinks: {},
    blobRefs: {},
    fontSizes: [],
    dsGlobals: {},
    dsPaths: [],
    fontShorthands: [],
    intents: [],
  };
  /** @type {Set<string>} */
  const dsPaths = new Set();
  for (const s of scanned) {
    for (const o of s.occurrences)
      bump(
        inv[OCCURRENCE_COUNTER[o.kind]],
        o.kind === "varText" ? o.file : o.value,
      );
    for (const c of s.blClasses) bump(inv.blClasses, c);
    for (const g of s.dsGlobals) bump(inv.dsGlobals, g);
    for (const p of s.dsPaths) dsPaths.add(p);
    inv.fontSizes.push(...s.fontSizes);
    inv.fontShorthands.push(...s.fontShorthands);
    inv.intents.push(...s.intents);
  }
  inv.dsPaths = [...dsPaths].sort();
  return inv;
}

/**
 * The `--sg-*` variable names a theme file produces (spacing aside).
 * @param {unknown} theme - Parsed theme JSON
 * @returns {Set<string>} Variable names, `--` included
 */
export function themeVariableNames(theme) {
  /** @type {Set<string>} */
  const names = new Set();
  if (typeof theme !== "object" || theme === null) return names;
  const record = /** @type {Record<string, unknown>} */ (theme);
  for (const [category, prefix] of CATEGORY_PREFIXES) {
    const tokens = record[category];
    if (typeof tokens !== "object" || tokens === null) continue;
    for (const key of Object.keys(tokens))
      names.add(`--${prefix}-${toKebabCase(key)}`);
  }
  return names;
}

/**
 * @typedef {object} CheckOptions
 * @property {string} canvasDir - Canvas directory
 * @property {string} theme - Theme JSON file the canvas must follow
 * @property {string} [stamp] - Design-system stamp JSON (`{ themeSha256 }`)
 * @property {readonly string[]} [intents] - Allowed button `color` values
 */

/**
 * What is wrong with one occurrence, if anything.
 * @param {Occurrence} o - A variable, `--bl-` text or blob reference
 * @param {Set<string>} known - `themeVariableNames(theme)`
 * @returns {string | null} The message, without its location
 */
function occurrenceViolation(o, known) {
  switch (o.kind) {
    case "var":
      return ALLOWED_VAR.test(o.value)
        ? null
        : `second token namespace ${o.value}`;
    case "varText":
      return `parallel token text ${o.value}`;
    case "blobLink":
      return `unchecked stylesheet /_blob/${o.value}`;
    case "blobRef":
      return `unchecked blob link /_blob/${o.value}`;
    default:
      return o.value.startsWith("--sg-sp-") || known.has(o.value)
        ? null
        : `unknown token ${o.value}`;
  }
}

/**
 * Violations of one scanned file, each `<file>:<line> <message>`.
 * @param {ScannedFile} s - From `scanText`
 * @param {Set<string>} known - `themeVariableNames(theme)`
 * @param {CheckOptions["intents"]} intents - Allowed button `color` values
 * @returns {string[]} In check order
 */
function fileViolations(s, known, intents) {
  /** @type {string[]} */
  const out = [];
  /**
   * @param {{ file: string, line: number }} where - Location
   * @param {string} message - What is wrong
   */
  const report = (where, message) => {
    out.push(`${where.file}:${String(where.line)} ${message}`);
  };
  for (const o of s.occurrences) {
    const message = occurrenceViolation(o, known);
    if (message !== null) report(o, message);
  }
  for (const f of s.fontSizes.filter((x) => x.value !== "inherit"))
    report(f, `font-size ${f.value} (use a typography class)`);
  for (const f of s.fontShorthands.filter((x) => x.value !== "inherit"))
    report(f, "font shorthand (use a typography class)");
  for (const i of intents ? s.intents : [])
    if (!intents?.includes(i.value)) report(i, `unknown intent ${i.value}`);
  return out;
}

/**
 * Whether the stamp records the SHA-256 of these theme bytes.
 * @param {string} stamp - Stamp JSON file (`{ themeSha256 }`)
 * @param {Buffer} themeBytes - Theme file contents
 * @returns {boolean} True when it does
 */
function stampMatches(stamp, themeBytes) {
  const sha = createHash("sha256").update(themeBytes).digest("hex");
  /** @type {unknown} */
  const parsed = JSON.parse(readFileSync(stamp, "utf8"));
  if (typeof parsed !== "object" || parsed === null) return false;
  return /** @type {Record<string, unknown>} */ (parsed).themeSha256 === sha;
}

/**
 * Violations of the one-theme rule, each `<file>:<line> <message>`.
 * @param {CheckOptions} options - Canvas, theme and the optional stamp and intents
 * @returns {string[]} Empty when the canvas follows the theme
 */
export function checkCanvas({ canvasDir, theme, stamp, intents }) {
  const themeBytes = readFileSync(theme);
  const known = themeVariableNames(JSON.parse(themeBytes.toString("utf8")));
  const out = scanCanvas(canvasDir).flatMap((s) =>
    fileViolations(s, known, intents),
  );
  if (stamp !== undefined && !stampMatches(stamp, themeBytes))
    out.push(
      `${stamp}:1 stamp does not match theme (rebuild the design system)`,
    );
  return out;
}

const USAGE =
  "usage: node scripts/check-design-canvas.mjs --canvas <dir> --theme <file> [--stamp <file>] [--intents a,b,c] [--inventory]";

/**
 * Parses the CLI flags.
 * @param {string[]} args - `process.argv.slice(2)`
 * @returns {{ canvas: string, theme: string, stamp?: string, intents?: string[], inventory: boolean } | null} The flags, or null on a usage error
 */
export function parseArgs(args) {
  /** @type {Record<string, string>} */
  const values = {};
  let inventory = false;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === "--inventory") {
      inventory = true;
      continue;
    }
    if (
      flag !== "--canvas" &&
      flag !== "--theme" &&
      flag !== "--stamp" &&
      flag !== "--intents"
    )
      return null;
    const value = args[i + 1];
    if (value === undefined || value.startsWith("--")) return null;
    values[flag.slice(2)] = value;
    i++;
  }
  const { canvas, theme, stamp, intents } = values;
  if (canvas === undefined || theme === undefined) return null;
  return {
    canvas,
    theme,
    inventory,
    ...(stamp === undefined ? {} : { stamp }),
    ...(intents === undefined
      ? {}
      : {
          intents: intents
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
  };
}

/** CLI: print the inventory, or the violations and set exit code 1, or OK. */
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args === null) {
    console.error(USAGE);
    process.exitCode = 2;
    return;
  }
  if (args.inventory) {
    console.log(JSON.stringify(inventoryCanvas(args.canvas), null, 2));
    return;
  }
  const violations = checkCanvas({
    canvasDir: args.canvas,
    theme: args.theme,
    ...(args.stamp === undefined ? {} : { stamp: args.stamp }),
    ...(args.intents === undefined ? {} : { intents: args.intents }),
  });
  if (violations.length > 0) {
    for (const v of violations) console.log(v);
    console.log(`${String(violations.length)} violation(s)`);
    process.exitCode = 1;
    return;
  }
  console.log(`OK: ${String(canvasFiles(args.canvas).length)} files`);
}

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
