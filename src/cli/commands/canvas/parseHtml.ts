/**
 * Parsers for the `/design` editor's board markup: line lookup, `<script>`
 * assignments, `style` attributes, the root element inside `<x-dc>`,
 * `<dc-import>`, the `data-sg-*` marker blocks and the `$preview` frame.
 * Every marker format the canvas rules read lives here.
 */

/**
 * Maps a string index to its 1-based line.
 * @param {string} text - File contents
 * @returns {(index: number) => number} Lookup from index to line
 */
export function lineIndex(text: string): (index: number) => number {
  const starts: number[] = [0];
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

export type LineOf = (index: number) => number;

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
function expressionEnd(script: string, start: number): number {
  let depth = 0;
  let quote: string | null = null;
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
function assignedExpressions(script: string, name: string): string[] {
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
export function boundLiterals(
  text: string,
  name: string,
  literal: RegExp,
): string[] {
  const key = name.split(".").pop() ?? name;
  const out: string[] = [];
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

export const PX_LITERAL = /['"`](\d+(?:\.\d+)?px)['"`]/g;

export const ANY_LITERAL = /['"`]([^'"`\n]*)['"`]/g;

export const BINDING = /^\{\{\s*([\w$.]+)\s*\}\}$/;

/**
 * `font-weight`/`line-height`/`font-family` of a declaration block.
 * @param {string} block - Declarations
 * @param {string} property - Property name
 * @returns {string | null} Trimmed value, or null when absent
 */
export function blockValue(block: string, property: string): string | null {
  const match = new RegExp(`(?<![\\w-])${property}\\s*:\\s*([^;}"]+)`).exec(
    block,
  );
  return match ? (match[1] ?? "").trim() : null;
}

export interface StyleAttr {
  start: number;
  end: number;
  value: string;
}

/**
 * Every `style="…"` and `style='…'` attribute with the range of its value.
 * @param {string} text - File contents
 * @returns {StyleAttr[]} In document order
 */
export function styleAttributes(text: string): StyleAttr[] {
  return [...text.matchAll(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(
    (m) => {
      const value = m[1] ?? m[2] ?? "";
      // The value ends right before the closing quote, the last character.
      const start = m.index + m[0].length - 1 - value.length;
      return { start, end: start + value.length, value };
    },
  );
}

/**
 * The declaration block around `index`, and the element text when it is a
 * `style` attribute.
 * @param {string} text - File contents
 * @param {StyleAttr[]} styleAttrs - From `styleAttributes(text)`
 * @param {number} index - Position of the declaration
 * @returns {{ block: string, text: string | null }} Block and element text
 */
export function declarationContext(
  text: string,
  styleAttrs: StyleAttr[],
  index: number,
): { block: string; text: string | null } {
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

/** An HTML start tag, `>` inside a quoted attribute value included. */
const START_TAG = /<([a-zA-Z][\w-]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/y;

/**
 * The value of one attribute of a start tag.
 * @param {string} tag - Start tag source
 * @param {string} name - Attribute name
 * @returns {string | null} The value (`""` for a bare attribute), or null when absent
 */
function attributeValue(tag: string, name: string): string | null {
  const match = new RegExp(
    `\\s${name}(?:\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+)))?(?=[\\s/>])`,
    "i",
  ).exec(tag);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? "";
}

/**
 * The first element inside `<x-dc>`, after whitespace, comments and the
 * `<helmet>` block.
 * @param {string} text - File contents
 * @returns {{ style: string, className: string, line: number } | null} Its `style` and `class` (empty when absent) and 1-based line, or null
 */
export function rootElement(
  text: string,
): { style: string; className: string; line: number } | null {
  const open = /<x-dc\b[^>]*>/i.exec(text);
  if (!open) return null;
  let at = open.index + open[0].length;
  for (;;) {
    while (/\s/.test(text[at] ?? "")) at++;
    if (text.startsWith("<!--", at)) {
      const end = text.indexOf("-->", at);
      if (end === -1) return null;
      at = end + 3;
    } else if (/^<helmet\b/i.test(text.slice(at, at + 8))) {
      const end = text.toLowerCase().indexOf("</helmet>", at);
      if (end === -1) return null;
      at = end + "</helmet>".length;
    } else break;
  }
  START_TAG.lastIndex = at;
  const tag = START_TAG.exec(text);
  if (!tag) return null;
  return {
    style: attributeValue(tag[0], "style") ?? "",
    className: attributeValue(tag[0], "class") ?? "",
    line: lineIndex(text)(at),
  };
}

/**
 * The declarations of a `style` attribute value.
 * @param {string} style - `style` attribute value
 * @returns {Map<string, string>} Lower-cased property → trimmed value
 */
export function styleDeclarations(style: string): Map<string, string> {
  const out = new Map<string, string>();
  let start = 0;
  let depth = 0;
  let quote: string | null = null;
  /** @param {number} end - Index one past the declaration */
  const push = (end: number) => {
    const declaration = style.slice(start, end);
    const colon = declaration.indexOf(":");
    if (colon > 0)
      out.set(
        declaration.slice(0, colon).trim().toLowerCase(),
        declaration.slice(colon + 1).trim(),
      );
  };
  for (let i = 0; i < style.length; i++) {
    const ch = style[i] ?? "";
    if (quote !== null) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === ";" && depth === 0) {
      push(i);
      start = i + 1;
    }
  }
  push(style.length);
  return out;
}

/**
 * Every `<dc-import name="…">`.
 * @param {string} text - File contents
 * @param {LineOf} lineOf - Index to line
 * @returns {{ name: string, line: number }[]} In document order
 */
export function dcImports(
  text: string,
  lineOf: LineOf,
): { name: string; line: number }[] {
  return [...text.matchAll(/<dc-import\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)].map(
    (m) => ({
      name: attributeValue(m[0], "name") ?? "",
      line: lineOf(m.index),
    }),
  );
}

/**
 * Every `<script type="application/json" <attribute>="key">` block.
 * @param {string} text - File contents
 * @param {string} attribute - Marker attribute (`data-sg-literal`, `data-sg-provenance`)
 * @param {LineOf} lineOf - Index to line
 * @returns {{ key: string, line: number, value: unknown, error: boolean }[]} In document order; `error` when the body is not JSON
 */
export function jsonBlocks(
  text: string,
  attribute: string,
  lineOf: LineOf,
): { key: string; line: number; value: unknown; error: boolean }[] {
  const out: { key: string; line: number; value: unknown; error: boolean }[] =
    [];
  for (const m of text.matchAll(
    /<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script>/gi,
  )) {
    const tag = `<script${m[1] ?? ""}>`;
    const key = attributeValue(tag, attribute);
    if (key === null || attributeValue(tag, "type") !== "application/json")
      continue;
    const line = lineOf(m.index);
    try {
      out.push({ key, line, value: JSON.parse(m[2] ?? ""), error: false });
    } catch {
      out.push({ key, line, value: undefined, error: true });
    }
  }
  return out;
}

/**
 * The `data-sg-section` ids of a board.
 * @param {string} text - File contents
 * @returns {string[]} In document order
 */
export function sectionIds(text: string): string[] {
  return [
    ...text.matchAll(/\sdata-sg-section\s*=\s*(?:"([^"]*)"|'([^']*)')/g),
  ].map((m) => m[1] ?? m[2] ?? "");
}

/**
 * The `$preview` frame of the `data-dc-script` block's `data-props`.
 * @param {string} text - File contents
 * @returns {{ width: number, height: number } | null} Both numbers, or null when absent or unreadable
 */
export function previewSize(
  text: string,
): { width: number; height: number } | null {
  for (const m of text.matchAll(/<script\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)) {
    if (attributeValue(m[0], "data-dc-script") === null) continue;
    const props = attributeValue(m[0], "data-props");
    if (props === null) return null;
    const json = props
      .replaceAll("&quot;", '"')
      .replaceAll("&#39;", "'")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&");
    try {
      const preview = asRecord(asRecord(JSON.parse(json)).$preview);
      const { width, height } = preview;
      return typeof width === "number" && typeof height === "number"
        ? { width, height }
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * @param {unknown} value - Parsed JSON
 * @returns {Record<string, unknown>} The value when it is a plain object, else `{}`
 */
export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * @param {unknown} value - Parsed JSON
 * @returns {unknown[]} The value when it is an array, else `[]`
 */
export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * @param {unknown} value - Parsed JSON
 * @returns {boolean} Whether it is a plain object
 */
export function isPlainObject(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
