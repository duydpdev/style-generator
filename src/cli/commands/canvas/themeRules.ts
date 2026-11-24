/**
 * `--naming` rules over the theme: primitive and semantic colours, `themeAxes`
 * overrides, value-named typography on the type scale and the radius keys.
 */
import { asRecord } from "./parseHtml";
import type { Standard } from "./standardSchema";

/** A primitive colour key: hue + step, or black/white, with an optional alpha. Both agent contracts print its source. */
export const PRIMITIVE =
  /^(?:[a-z]+(?:[1-9]00)|black|white)(?:Alpha[1-9]\d?)?$/;

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
