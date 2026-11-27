/**
 * Class candidates read from text: the `class` attributes of boards and the
 * string literals of a preset. Nothing here runs product code; a preset is
 * only ever read as text.
 */
import { lineIndex } from "./parseHtml";

/** One class name, where the file wrote it. */
export interface ClassUse {
  file: string;
  line: number;
  candidate: string;
}

// Characters a Tailwind class (variants, `!`, `/` modifiers) is made of; an arbitrary value
// in `[…]` or `(…)` may hold more (a comma, a quote).
const CLASS_CHARS = /^[!@\w\-:/.#%&>*=+~^|]+$/;

// `[…]` and `(…)` groups become one `_`: an arbitrary value may hold characters a class name cannot.
function withoutGroups(word: string): string {
  let out = "";
  let i = 0;
  while (i < word.length) {
    const char = word.charAt(i);
    const close = { "[": "]", "(": ")" }[char];
    const end = close === undefined ? -1 : word.indexOf(close, i + 1);
    out += end < 0 ? char : "_";
    i = end < 0 ? i + 1 : end + 1;
  }
  return out;
}

const isCandidate = (word: string): boolean =>
  CLASS_CHARS.test(withoutGroups(word));

// A literal right after `import` or `from` is a module path, not a class list.
const isModulePath = (before: string): boolean =>
  /\b(?:from|import)$/.test(before.trimEnd().replace(/\($/, "").trimEnd());

/**
 * The whitespace-separated words of text that can be a class name.
 * @param {string} text - One class list
 * @returns {string[]} Candidates in order, `{{ … }}` bindings and sentences dropped
 */
export const candidatesOf = (text: string): string[] =>
  text.split(/\s+/).filter(isCandidate);

// Index of the quote closing the literal opened at `start`, or -1. Only a template spans lines.
function closingQuote(source: string, start: number): number {
  const quote = source[start];
  let i = start + 1;
  while (i < source.length) {
    const char = source[i];
    if (char === quote) return i;
    if (char === "\n" && quote !== "`") return -1;
    i += char === "\\" ? 2 : 1;
  }
  return -1;
}

// Where a comment starting at `start` ends, or `start` when there is none.
function commentEnd(source: string, start: number): number {
  if (source.startsWith("//", start)) {
    const end = source.indexOf("\n", start);
    return end < 0 ? source.length : end;
  }
  if (!source.startsWith("/*", start)) return start;
  const end = source.indexOf("*/", start + 2);
  return end < 0 ? start : end + 2;
}

// The text of every string literal, template expressions read as code. Comments are
// skipped whole so an apostrophe in one never opens a literal.
function literals(source: string, out: string[]): void {
  let i = 0;
  while (i < source.length) {
    const skipped = commentEnd(source, i);
    const quote = source.charAt(i);
    const end = "\"'`".includes(quote) ? closingQuote(source, i) : -1;
    if (skipped > i) i = skipped;
    else if (end < 0) i += 1;
    else {
      const before = source.slice(Math.max(0, i - 16), i);
      if (!isModulePath(before) && !isKey(source, i, end))
        pushLiteral(source.slice(i + 1, end), quote === "`", out);
      i = end + 1;
    }
  }
}

// A literal that opens an object entry (`{ "text-link": …`, `, "a": …`) is a key, not a class list;
// the `:` after a ternary branch has a `?` before it instead.
const isKey = (source: string, start: number, end: number): boolean =>
  /^\s*:/.test(source.slice(end + 1, end + 40)) &&
  /[{,]$/.test(source.slice(0, start).trimEnd());

function pushLiteral(text: string, template: boolean, out: string[]): void {
  if (!template) {
    out.push(text);
    return;
  }
  out.push(
    text.replace(/\$\{([^}]*)\}/g, (_whole, expression: string) => {
      literals(expression, out);
      return " ";
    }),
  );
}

/**
 * The class candidates a preset file spells out, read as text.
 * @param {string} source - The preset's source
 * @returns {string[]} Distinct candidates in first-seen order
 */
export function presetCandidates(source: string): string[] {
  const found: string[] = [];
  literals(source, found);
  return [...new Set(found.flatMap(candidatesOf))];
}

// The line a word first appears on as a whole token, else 1.
function firstLine(
  source: string,
  word: string,
  lineOf: (index: number) => number,
): number {
  for (
    let at = source.indexOf(word);
    at >= 0;
    at = source.indexOf(word, at + 1)
  ) {
    const before = source[at - 1] ?? " ";
    const after = source[at + word.length] ?? " ";
    if (!/[\w:-]/.test(before) && !/[\w-]/.test(after)) return lineOf(at);
  }
  return 1;
}

/**
 * The classes a preset spells out, each at the line it first appears on.
 * @param {string} file - The preset path as the user wrote it
 * @param {string} source - The preset's source
 * @returns {ClassUse[]} One entry per distinct class
 */
export function presetUses(file: string, source: string): ClassUse[] {
  const lineOf = lineIndex(source);
  return presetCandidates(source).map((candidate) => ({
    file,
    line: firstLine(source, candidate, lineOf),
    candidate,
  }));
}

/**
 * The classes a board writes in `class="…"` attributes.
 * @param {string} file - Path relative to the canvas dir
 * @param {string} text - File contents
 * @returns {ClassUse[]} One entry per class use, with its line
 */
export function boardClassUses(file: string, text: string): ClassUse[] {
  const lineOf = lineIndex(text);
  const uses: ClassUse[] = [];
  for (const m of text.matchAll(/\bclass\s*=\s*(["'])([^"']*)\1/g)) {
    const value = m[2] ?? "";
    const base = m.index + m[0].indexOf(value, m[0].indexOf("="));
    for (const word of value.matchAll(/\S+/g)) {
      if (isCandidate(word[0]))
        uses.push({
          file,
          line: lineOf(base + word.index),
          candidate: word[0],
        });
    }
  }
  return uses;
}
