/**
 * `--naming` rules over the theme: primitive and semantic colours, `themeAxes`
 * overrides, value-named typography on the type scale and the radius keys.
 */
import { parseAliasRef } from "../../../core/tokenGrammar";

import { asRecord } from "./parseHtml";
import type { LayeredStandard } from "./standardLayer";
import type { Standard } from "./standardSchema";

/** A primitive colour key: hue + step, or black/white, with an optional alpha. Both agent contracts print its source. */
export const PRIMITIVE =
  /^(?:[a-z]+(?:50|[1-9]00|950)|black|white)(?:Alpha[1-9]\d?)?$/;

type Grammar = NonNullable<Standard["grammar"]>;

// camelCase segments: `okInk` → `ok`, `Ink`.
const segmentsOf = (key: string): string[] =>
  key.match(/(?:^[^A-Z]+)|[A-Z][^A-Z]*/g) ?? [key];

const upperFirst = (word: string): string =>
  word.charAt(0).toUpperCase() + word.slice(1);

const joinSegments = (segments: string[]): string =>
  segments
    .map((word, i) =>
      i === 0 ? word.charAt(0).toLowerCase() + word.slice(1) : upperFirst(word),
    )
    .join("");

/**
 * Whether a name is a valid product role: camelCase, not `on<Role>`, not starting with a
 * deprecated name (`ok`) and, with several segments, not ending in a suffix, state or `Ink`.
 * @param {string} role - A candidate role name
 * @param {Grammar} grammar - The colour grammar
 * @returns {boolean} True when the shape is allowed
 */
export function roleShapeAllowed(role: string, grammar: Grammar): boolean {
  const segments = segmentsOf(role);
  const first = (segments[0] ?? "").toLowerCase();
  const renamed = Object.keys(grammar.renames).filter(
    (from) => segmentsOf(from).length === 1,
  );
  if (first === "on" && segments.length > 1) return false;
  if (renamed.some((from) => from.toLowerCase() === first)) return false;
  if (!/^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]+)*$/.test(role)) return false;
  const last = segments.at(-1) ?? "";
  const reserved = [
    ...grammar.suffixes,
    ...grammar.states,
    ...renamed.map(upperFirst),
  ];
  return segments.length === 1 || !reserved.includes(last);
}

/**
 * The role of a semantic colour key: what remains after its suffixes and state.
 * @param {string} key - A theme colour key
 * @param {Grammar} grammar - The colour grammar
 * @returns {string | null} The role, or null for a neutral or primitive key
 */
export function roleOf(key: string, grammar: Grammar): string | null {
  if (PRIMITIVE.test(key) || grammar.neutral.includes(key)) return null;
  const suffixes = grammar.suffixes.map((s) => "(?:" + s + ")?").join("");
  const shape = new RegExp(
    `^(.+?)${suffixes}(?:${grammar.states.join("|")})?$`,
  );
  return shape.exec(key)?.[1] ?? null;
}

/** The grammar and the roles a theme may use: the packaged ones and the product's declared ones. */
interface Vocabulary {
  grammar: Grammar;
  declared: ReadonlySet<string>;
}

/**
 * The roles a colour key may be built on: the packaged roles and the product's declared roles.
 * Declared roles were validated when the standard loaded, so this never widens the grammar.
 * @param {Standard} standard - The standard, layered or packaged
 * @returns {Set<string>} Role names
 */
export function declaredRoles(
  standard: Standard | LayeredStandard,
): Set<string> {
  const added = "roles" in standard ? Object.keys(standard.roles ?? {}) : [];
  return new Set([...(standard.grammar?.roles ?? []), ...added]);
}

/**
 * Whether a semantic key follows `<role>[suffixes][state]` on a declared role, or is neutral.
 * @param {string} key - A theme colour key
 * @param {Vocabulary} vocab - Grammar and declared roles
 * @returns {boolean} True when the key is in the vocabulary
 */
export function followsGrammar(key: string, vocab: Vocabulary): boolean {
  if (vocab.grammar.neutral.includes(key)) return true;
  const role = roleOf(key, vocab.grammar);
  return role !== null && vocab.declared.has(role);
}

// The v2 name: whole deprecated segments renamed (longest first), `on` prefix to `Foreground`,
// suffixes in grammar order, state last. Returns `key` when nothing applies or two states clash.
function suggestName(key: string, grammar: Grammar): string {
  const renames = Object.entries(grammar.renames)
    .map(([from, to]) => [segmentsOf(from), segmentsOf(to)] as const)
    .sort((a, b) => b[0].length - a[0].length);
  const input = segmentsOf(key);
  const words: string[] = [];
  for (let i = 0; i < input.length;) {
    const hit = renames.find(
      ([from]) =>
        (from.length === 1 || (i === 0 && from.length === input.length)) &&
        from.every(
          (word, j) => input[i + j]?.toLowerCase() === word.toLowerCase(),
        ),
    );
    words.push(...(hit ? hit[1] : [input[i] ?? ""]));
    i += hit ? hit[0].length : 1;
  }
  const tail = new Set<string>();
  if (words[0]?.toLowerCase() === "on" && words.length > 1) {
    words.shift();
    tail.add("Foreground");
  }
  const trailing = [...grammar.suffixes, ...grammar.states];
  while (words.length > 1 && trailing.includes(upperFirst(words.at(-1) ?? "")))
    tail.add(upperFirst(words.pop() ?? ""));
  const states = grammar.states.filter((name) => tail.has(name));
  if (states.length > 1) return key;
  const [state] = states;
  return joinSegments([
    ...words,
    ...grammar.suffixes.filter((name) => tail.has(name)),
    ...(state ? [state] : []),
  ]);
}

// The v2 name of a key that breaks the grammar, or null when none follows the grammar.
function suggestionOf(key: string, vocab: Vocabulary): string | null {
  if (PRIMITIVE.test(key) || followsGrammar(key, vocab)) return null;
  const target = suggestName(key, vocab.grammar);
  return target !== key && followsGrammar(target, vocab) ? target : null;
}

// A key built on a well-formed role nobody declared: reported once per role, not as a broken name.
function undeclaredRole(key: string, vocab: Vocabulary): string | null {
  if (PRIMITIVE.test(key) || followsGrammar(key, vocab)) return null;
  const role = roleOf(key, vocab.grammar);
  return role !== null &&
    roleShapeAllowed(role, vocab.grammar) &&
    suggestionOf(key, vocab) === null
    ? role
    : null;
}

// Grammar message of one colour key; `taken` says whether a suggestion would fold two colours.
function grammarMessage(
  path: string,
  key: string,
  taken: (target: string) => boolean,
  vocab: Vocabulary,
): string | null {
  if (
    PRIMITIVE.test(key) ||
    followsGrammar(key, vocab) ||
    undeclaredRole(key, vocab) !== null
  )
    return null;
  const { grammar } = vocab;
  const optional = grammar.suffixes.map((s) => "[" + s + "]").join("");
  const form = `<role>${optional}[${grammar.states.join("|")}]`;
  const target = suggestionOf(key, vocab);
  if (target === null) return `${path} does not follow ${form}`;
  return taken(target)
    ? `${path} does not follow ${form} (${target} exists: merge manually)`
    : `${path} does not follow ${form} (rename to ${target})`;
}

// A target is taken when it is a base key or the suggestion of more than one base key.
function takenTargets(
  colors: Record<string, unknown>,
  vocab: Vocabulary,
): (target: string) => boolean {
  const claims = new Map<string, number>();
  for (const key of Object.keys(colors)) {
    const target = suggestionOf(key, vocab);
    if (target !== null) claims.set(target, (claims.get(target) ?? 0) + 1);
  }
  return (target) =>
    Object.hasOwn(colors, target) || (claims.get(target) ?? 0) > 1;
}

// `"$blue600"` and `"$blue600/8"` → `blue600`; null for a literal.
function aliasTarget(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("$")) return null;
  return parseAliasRef(value)?.key ?? value.slice(1);
}

/** One naming problem: an error, or a finding when `finding` is set. */
export interface NamingIssue {
  message: string;
  rule?: string;
  /** What an exemption names to silence this issue. */
  name?: string;
  finding?: boolean;
}

// `a, b and 2 more` for a list longer than three.
const listed = (items: readonly string[]): string =>
  items.length <= 3
    ? items.join(", ")
    : `${items.slice(0, 3).join(", ")} and ${String(items.length - 3)} more`;

// Grammar errors per key and one finding per undeclared role, over the base colours and the override keys.
function vocabularyIssues(
  theme: Record<string, unknown>,
  standard: Standard | LayeredStandard,
): NamingIssue[] {
  const { grammar } = standard;
  if (!grammar) return [];
  const colors = asRecord(theme.colors);
  const vocab = { grammar, declared: declaredRoles(standard) };
  const taken = takenTargets(colors, vocab);
  const issues: NamingIssue[] = [];
  const undeclared = new Map<string, string[]>();
  const visit = (path: string, key: string) => {
    const role = undeclaredRole(key, vocab);
    if (role !== null) {
      undeclared.set(role, [...(undeclared.get(role) ?? []), path]);
      return;
    }
    const message = grammarMessage(path, key, taken, vocab);
    if (message !== null)
      issues.push({ message, rule: "name-vocabulary", name: key });
  };
  for (const key of Object.keys(colors)) visit(`colors.${key}`, key);
  for (const [axis, variants] of Object.entries(asRecord(theme.themeAxes)))
    for (const [variant, override] of Object.entries(asRecord(variants)))
      for (const key of Object.keys(asRecord(asRecord(override).colors)))
        visit(`themeAxes.${axis}.${variant}.colors.${key}`, key);
  for (const [role, paths] of undeclared)
    issues.push({
      message: `role ${role} is not declared (${listed([...new Set(paths)])}); add it to roles in the --standard file, or rename the keys to a declared role`,
      rule: "name-vocabulary",
      name: role,
      finding: true,
    });
  return issues;
}

// Primitives hold literals, semantic keys alias primitives, overrides redefine semantic keys only.
function colourIssues(
  theme: Record<string, unknown>,
  standard: Standard | LayeredStandard,
): NamingIssue[] {
  const colors = asRecord(theme.colors);
  const out: (string | null)[] = Object.entries(colors).map(([key, value]) =>
    baseColourMessage(`colors.${key}`, key, value),
  );
  for (const [axis, variants] of Object.entries(asRecord(theme.themeAxes)))
    for (const [variant, override] of Object.entries(asRecord(variants)))
      for (const [key, value] of Object.entries(
        asRecord(asRecord(override).colors),
      ))
        out.push(
          overrideColourMessage(
            `themeAxes.${axis}.${variant}.colors.${key}`,
            key,
            value,
          ),
        );
  for (const name of standard.semanticCore)
    if (!(name in colors)) out.push(`missing semantic core key ${name}`);
  return [
    ...out.filter((m) => m !== null).map((message) => ({ message })),
    ...vocabularyIssues(theme, standard),
  ];
}

function aliasTargetMessage(path: string, target: string): string | null {
  return PRIMITIVE.test(target)
    ? null
    : `${path} aliases semantic key ${target} (alias a primitive)`;
}

function baseColourMessage(
  path: string,
  key: string,
  value: unknown,
): string | null {
  const target = aliasTarget(value);
  if (PRIMITIVE.test(key))
    return target === null
      ? null
      : `${path} is a primitive name but holds an alias`;
  return target === null
    ? `${path} is not a primitive name and not an alias of a primitive`
    : aliasTargetMessage(path, target);
}

function overrideColourMessage(
  path: string,
  key: string,
  value: unknown,
): string | null {
  if (PRIMITIVE.test(key)) return `${path} overrides a primitive`;
  const target = aliasTarget(value);
  return target === null
    ? `${path} is not an alias of a primitive`
    : aliasTargetMessage(path, target);
}

// `text<size><Weight>` keys match their entry, sit on the scale, set no family, share a line height per size.
function typographyViolations(
  theme: Record<string, unknown>,
  standard: Standard,
): string[] {
  const pattern = new RegExp(
    `^text(\\d{2,3})(${Object.values(standard.weights).join("|")})$`,
  );
  const out: string[] = [];
  const lineHeights = new Map<number, string[]>();
  for (const [key, raw] of Object.entries(asRecord(theme.typography))) {
    const entry = asRecord(raw);
    const m = pattern.exec(key);
    if (!m) {
      out.push(`typography.${key} does not match text<size><Weight>`);
      continue;
    }
    const { px, messages } = typographyEntryMessages(key, entry, m, standard);
    out.push(...messages);
    const group = lineHeights.get(px) ?? [];
    group.push(`${key}=${String(entry.lineHeight)}`);
    lineHeights.set(px, group);
  }
  for (const [px, group] of lineHeights) {
    const distinct = new Set(group.map((g) => g.slice(g.indexOf("=") + 1)));
    if (distinct.size > 1)
      out.push(
        `typography line-height differs at ${String(px)}px: ${group.join(", ")}`,
      );
  }
  return out;
}

// One typography entry against the size and weight its key names (`m`: size, weight word).
function typographyEntryMessages(
  key: string,
  entry: Record<string, unknown>,
  m: RegExpExecArray,
  standard: Standard,
): { px: number; messages: string[] } {
  const path = `typography.${key}`;
  const size = m[1] ?? "";
  const word = m[2] ?? "";
  const fontSize = String(entry.fontSize);
  const weight = String(entry.fontWeight);
  const px = fontSize.endsWith("rem")
    ? parseFloat(fontSize) * 16
    : parseFloat(fontSize);
  const messages = [
    px === Number(size)
      ? null
      : `${path} name says ${size}px, fontSize is ${fontSize}`,
    standard.typeScale.includes(Number(size))
      ? null
      : `${path} size ${size}px is not on the scale`,
    standard.weights[weight] === word
      ? null
      : `${path} name says ${word}, fontWeight is ${weight}`,
    entry.fontFamily === undefined
      ? null
      : `${path} sets fontFamily (use a font-<family> class)`,
  ];
  return { px, messages: messages.filter((x) => x !== null) };
}

/**
 * Every naming-convention issue of a theme.
 * @param {unknown} theme - Parsed theme JSON
 * @param {Standard | LayeredStandard} standard - Manifest, with the product's additions when layered
 * @returns {NamingIssue[]} Issues without a location
 */
export function namingIssues(
  theme: unknown,
  standard: Standard | LayeredStandard,
): NamingIssue[] {
  const record = asRecord(theme);
  return [
    ...colourIssues(record, standard),
    ...typographyViolations(record, standard).map((message) => ({ message })),
  ];
}

/**
 * The message of every naming-convention issue of a theme, errors and findings alike.
 * @param {unknown} theme - Parsed theme JSON
 * @param {Standard | LayeredStandard} standard - Manifest
 * @returns {string[]} Messages without a location
 */
export function namingViolations(
  theme: unknown,
  standard: Standard | LayeredStandard,
): string[] {
  return namingIssues(theme, standard).map((issue) => issue.message);
}
