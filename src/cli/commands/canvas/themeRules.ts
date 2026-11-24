/**
 * `--naming` rules over the theme: primitive and semantic colours, `themeAxes`
 * overrides, value-named typography on the type scale and the radius keys.
 */
import { asRecord } from "./parseHtml";
import type { Standard } from "./standardSchema";

/** A primitive colour key: hue + step, or black/white, with an optional alpha. Both agent contracts print its source. */
export const PRIMITIVE =
  /^(?:[a-z]+(?:50|[1-9]00|950)|black|white)(?:Alpha[1-9]\d?)?$/;

type Grammar = NonNullable<Standard["grammar"]>;

/**
 * @param {string} key - A camelCase key
 * @returns {string[]} Its segments: `okInk` → `ok`, `Ink`
 */
const segmentsOf = (key: string): string[] =>
  key.match(/(?:^[^A-Z]+)|[A-Z][^A-Z]*/g) ?? [key];

/**
 * @param {string} word - A segment
 * @returns {string} The segment with its first letter upper-cased
 */
const upperFirst = (word: string): string =>
  word.charAt(0).toUpperCase() + word.slice(1);

/**
 * @param {string[]} segments - Segments in any case
 * @returns {string} The camelCase key they spell
 */
const joinSegments = (segments: string[]): string =>
  segments
    .map((word, i) =>
      i === 0 ? word.charAt(0).toLowerCase() + word.slice(1) : upperFirst(word),
    )
    .join("");

/**
 * Whether a role (the key without its suffixes and state) is a core role or
 * a product role: camelCase, not `on<Role>`, not starting with a deprecated
 * lower-case name (`ok`, `line`), and, when it has several segments, not
 * ending in a suffix, a state or a deprecated segment (`Ink`, `Ok`).
 * @param {string} role - Role part of a key
 * @param {Grammar} grammar - Manifest grammar
 * @returns {boolean} `true` when the role is allowed
 */
function roleAllowed(role: string, grammar: Grammar): boolean {
  if (grammar.roles.includes(role)) return true;
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
 * Whether a semantic key follows `<role>[suffixes][state]` or is neutral.
 * @param {string} key - Non-primitive colour key
 * @param {Grammar} grammar - Manifest grammar
 * @returns {boolean} `true` when the key follows the grammar
 */
function followsGrammar(key: string, grammar: Grammar): boolean {
  if (grammar.neutral.includes(key)) return true;
  const suffixes = grammar.suffixes.map((s) => "(?:" + s + ")?").join("");
  const shape = new RegExp(
    `^(.+?)${suffixes}(?:${grammar.states.join("|")})?$`,
  );
  const role = shape.exec(key)?.[1];
  return role !== undefined && roleAllowed(role, grammar);
}

/**
 * The v2 name for a key: deprecated segments renamed (longest first, whole
 * segments only), an `on` prefix moved to a `Foreground` suffix, then the
 * trailing suffixes put in grammar order with the state last. A key with two
 * different states has no single v2 name.
 * @param {string} key - Key that does not follow the grammar
 * @param {Grammar} grammar - Manifest grammar
 * @returns {string} Suggested key (equal to `key` when nothing applies)
 */
function suggestName(key: string, grammar: Grammar): string {
  const renames = Object.entries(grammar.renames)
    .map(([from, to]) => [segmentsOf(from), segmentsOf(to)] as const)
    .sort((a, b) => b[0].length - a[0].length);
  const input = segmentsOf(key);
  const words: string[] = [];
  for (let i = 0; i < input.length; ) {
    const hit = renames.find(([from]) =>
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

/**
 * The v2 name of a key that breaks the grammar, or null when there is none
 * (no rule applies, or the result still breaks the grammar).
 * @param {string} key - Colour key
 * @param {Grammar} grammar - Manifest grammar
 * @returns {string | null} The suggestion
 */
function suggestionOf(key: string, grammar: Grammar): string | null {
  if (PRIMITIVE.test(key) || followsGrammar(key, grammar)) return null;
  const target = suggestName(key, grammar);
  return target !== key && followsGrammar(target, grammar) ? target : null;
}

/**
 * Grammar message of one semantic colour key, or null.
 * @param {string} path - Where the key is
 * @param {string} key - Colour key
 * @param {(target: string) => boolean} taken - Whether a suggestion would fold two colours: it is a base `colors` key, or the suggestion of another base key
 * @param {Grammar} grammar - Manifest grammar
 * @returns {string | null} The message, or null when the key follows the grammar
 */
function grammarMessage(
  path: string,
  key: string,
  taken: (target: string) => boolean,
  grammar: Grammar,
): string | null {
  if (PRIMITIVE.test(key) || followsGrammar(key, grammar)) return null;
  const optional = grammar.suffixes.map((s) => "[" + s + "]").join("");
  const form = `<role>${optional}[${grammar.states.join("|")}]`;
  const target = suggestionOf(key, grammar);
  if (target === null) return `${path} does not follow ${form}`;
  return taken(target)
    ? `${path} does not follow ${form} (${target} exists: merge manually)`
    : `${path} does not follow ${form} (rename to ${target})`;
}

/**
 * @param {Record<string, unknown>} colors - Base `colors`
 * @param {Grammar} grammar - Manifest grammar
 * @returns {(target: string) => boolean} Whether renaming to `target` would fold two colours
 */
function takenTargets(
  colors: Record<string, unknown>,
  grammar: Grammar,
): (target: string) => boolean {
  const claims = new Map<string, number>();
  for (const key of Object.keys(colors)) {
    const target = suggestionOf(key, grammar);
    if (target !== null) claims.set(target, (claims.get(target) ?? 0) + 1);
  }
  return (target) =>
    Object.hasOwn(colors, target) || (claims.get(target) ?? 0) > 1;
}

/**
 * @param {unknown} value - A colour value
 * @returns {string | null} The alias target (`"$blue600"` → `blue600`), or null for a literal
 */
function aliasTarget(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("$")
    ? value.slice(1)
    : null;
}

/**
 * @param {Record<string, unknown>} colors - Base `colors`
 * @param {Grammar | undefined} grammar - Manifest grammar; absent skips the rule
 * @returns {(path: string, key: string) => string | null} The grammar message of a key at a path
 */
function grammarCheck(
  colors: Record<string, unknown>,
  grammar: Grammar | undefined,
): (path: string, key: string) => string | null {
  if (!grammar) return () => null;
  const taken = takenTargets(colors, grammar);
  return (path, key) => grammarMessage(path, key, taken, grammar);
}

/**
 * Colour messages of a theme: primitives hold literals, semantic keys alias
 * primitives, overrides redefine semantic keys only, the core is present.
 * @param {Record<string, unknown>} theme - Parsed theme JSON
 * @param {Standard} standard - Manifest
 * @returns {string[]} Messages without a location
 */
function colourViolations(
  theme: Record<string, unknown>,
  standard: Standard,
): string[] {
  const colors = asRecord(theme.colors);
  const grammarOf = grammarCheck(colors, standard.grammar);
  const out: (string | null)[] = Object.entries(colors).flatMap(
    ([key, value]) => [
      baseColourMessage(`colors.${key}`, key, value),
      grammarOf(`colors.${key}`, key),
    ],
  );
  for (const [axis, variants] of Object.entries(asRecord(theme.themeAxes)))
    for (const [variant, override] of Object.entries(asRecord(variants)))
      for (const [key, value] of Object.entries(
        asRecord(asRecord(override).colors),
      )) {
        const path = `themeAxes.${axis}.${variant}.colors.${key}`;
        out.push(overrideColourMessage(path, key, value), grammarOf(path, key));
      }
  for (const name of standard.semanticCore)
    if (!(name in colors)) out.push(`missing semantic core key ${name}`);
  return out.filter((m) => m !== null);
}

/**
 * @param {string} path - Where the alias is
 * @param {string} target - Alias target
 * @returns {string | null} The message when the target is not a primitive
 */
function aliasTargetMessage(path: string, target: string): string | null {
  return PRIMITIVE.test(target)
    ? null
    : `${path} aliases semantic key ${target} (alias a primitive)`;
}

/**
 * A colour of the base `colors` record.
 * @param {string} path - `colors.<key>`
 * @param {string} key - Colour key
 * @param {unknown} value - Its value
 * @returns {string | null} The message, or null when the key follows the convention
 */
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

/**
 * A colour of a `themeAxes` override.
 * @param {string} path - `themeAxes.<axis>.<variant>.colors.<key>`
 * @param {string} key - Colour key
 * @param {unknown} value - Its value
 * @returns {string | null} The message, or null when the override follows the convention
 */
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

/**
 * Typography messages: `text<size><Weight>` keys that match their entry, sit
 * on the type scale, set no font family and share a line height per size.
 * @param {Record<string, unknown>} theme - Parsed theme JSON
 * @param {Standard} standard - Manifest
 * @returns {string[]} Messages without a location
 */
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

/**
 * One typography entry against the size and weight its key names.
 * @param {string} key - `text<size><Weight>` key
 * @param {Record<string, unknown>} entry - Its entry
 * @param {RegExpExecArray} m - The key's match: size, weight word
 * @param {Standard} standard - Manifest
 * @returns {{ px: number, messages: string[] }} The entry's size in px, and its messages
 */
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
 * Every naming-convention message of a theme.
 * @param {unknown} theme - Parsed theme JSON
 * @param {Standard} standard - Manifest
 * @returns {string[]} Messages without a location
 */
export function namingViolations(theme: unknown, standard: Standard): string[] {
  const record = asRecord(theme);
  const out = [
    ...colourViolations(record, standard),
    ...typographyViolations(record, standard),
  ];
  for (const key of Object.keys(asRecord(record.borderRadius)))
    if (!standard.radius.includes(key))
      out.push(
        `borderRadius.${key} is not one of ${standard.radius.join(", ")}`,
      );
  return out;
}
