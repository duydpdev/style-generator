// Maps a style-generator theme to the `tokens.json` of a claude.ai Design System artifact.
// Pure: no file I/O. The shape follows the Design System type's `reference/format.md`:
// every family but `type` is `{ tokens: [{ name, value, usage }] }`, `color` also has
// `themes`, and a color alias is written `"{other-token}"`.
import { toKebabCase } from "../dist/cva.js";

/** @typedef {{ name: string, value: unknown, usage: string }} DsToken */
/** @typedef {{ tokens: DsToken[] }} DsFamily */
/** @typedef {{ name: string, value: string, usage?: string }} DsSpacing */
/** @typedef {{ fontSize: string, lineHeight: string | number, fontWeight: number, letterSpacing?: string, fontFamily?: string }} TypographyStyle */
/** @typedef {{ name: string, fontSize: string, lineHeight: string | number, fontWeight: number, letterSpacing?: string }} TypeStyle */
/** @typedef {Record<string, Record<string, string>>} ThemeOverride */
/**
 * @typedef {object} ThemeInput
 * @property {Record<string, string>} colors Color key → value or `$alias`.
 * @property {Record<string, TypographyStyle>} [typography] Typography roles.
 * @property {Record<string, string>} [shadows] Shadow values.
 * @property {Record<string, string>} [backdropBlurs] Backdrop blur values.
 * @property {Record<string, string>} [borderRadius] Radius values.
 * @property {Record<string, string>} [fontFamily] Font family stacks.
 * @property {Record<string, string>} [borderWidth] Border width values.
 * @property {Record<string, string>} [controlHeight] Control height values.
 * @property {Record<string, Record<string, ThemeOverride>>} [themeAxes] Axis → variant → override.
 */
/** @typedef {{ id: string, name: string, override: ThemeOverride }} Variant */

/**
 * @typedef {object} DsTokensOptions
 * @property {string} name The design system's title.
 * @property {Record<string, string>} [usage] One usage line per theme color key.
 * @property {DsSpacing[]} [spacing] Spacing tokens, names used verbatim.
 * @property {readonly number[]} [opacities] Opacity steps (1–100) of `coverage.colors.opacities`.
 * @property {Record<string, string>} [screens] Breakpoint name → min width, one entry per covered breakpoint.
 */

const BASE_THEME = { id: "light", name: "Light" };

/**
 * `highContrast` → `High contrast`.
 * @param {string} key - A camelCase theme key
 * @returns {string} The key as a sentence-case label
 */
function sentenceCase(key) {
  const words = toKebabCase(key).replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * A `$alias` becomes the type's alias form; a hex color is lowercased.
 * @param {string} value - A theme color value
 * @returns {string} The Design System color value
 */
function colorValue(value) {
  if (value.startsWith("$")) return `{${toKebabCase(value.slice(1))}}`;
  return /^#[0-9a-f]+$/i.test(value) ? value.toLowerCase() : value;
}

/**
 * `"150%"` → `1.5`; any other line height is kept.
 * @param {string | number} value - A typography line height
 * @returns {string | number} The unitless line height when the value is a percentage
 */
function lineHeight(value) {
  const percent = /^(\d+(?:\.\d+)?)%$/.exec(String(value));
  return percent ? Number(percent[1]) / 100 : value;
}

/**
 * Every variant of every axis, flattened in declaration order; a duplicate theme id throws.
 * @param {ThemeInput["themeAxes"]} themeAxes - The theme's axes
 * @returns {Variant[]} One entry per variant
 */
function collectVariants(themeAxes) {
  const variants = Object.values(themeAxes ?? {}).flatMap((axis) =>
    Object.entries(axis).map(([key, override]) => ({
      id: toKebabCase(key),
      name: sentenceCase(key),
      override,
    })),
  );
  const ids = new Set([BASE_THEME.id]);
  for (const v of variants) {
    if (ids.has(v.id)) throw new Error(`two themes share the id "${v.id}"`);
    ids.add(v.id);
  }
  return variants;
}

/**
 * The `color` family: one theme per variant, one value per theme (the variant's override, else the base value).
 * @param {ThemeInput} theme - The theme
 * @param {Variant[]} variants - Its variants
 * @param {Record<string, string>} usage - Usage line per color key
 * @returns {{ themes: { id: string, name: string }[], tokens: DsToken[] }} The color family
 */
function colorFamily(theme, variants, usage) {
  return {
    themes: [BASE_THEME, ...variants.map(({ id, name }) => ({ id, name }))],
    tokens: Object.entries(theme.colors).map(([key, base]) => ({
      name: toKebabCase(key),
      value: Object.fromEntries([
        [BASE_THEME.id, colorValue(base)],
        ...variants.map((v) => [
          v.id,
          colorValue(v.override.colors?.[key] ?? base),
        ]),
      ]),
      usage: usage[key] ?? "",
    })),
  };
}

/**
 * The family key a typography role uses: its own `var(--sg-font-<key>)`, else the default family.
 * @param {string} key - The typography key
 * @param {TypographyStyle} style - The typography role
 * @param {string[]} familyKeys - The theme's `fontFamily` keys
 * @param {string | undefined} defaultFamily - The family a role without one uses
 * @returns {string | undefined} The family key
 */
function resolveFamily(key, style, familyKeys, defaultFamily) {
  const own = /^var\(--sg-font-([\w-]+)\)$/.exec(style.fontFamily ?? "")?.[1];
  if (!own) return defaultFamily;
  const family = familyKeys.find((k) => toKebabCase(k) === own);
  if (!family)
    throw new Error(`typography.${key} uses an unknown font family "${own}"`);
  return family;
}

/**
 * One type style; `letterSpacing` only when the role sets it.
 * @param {string} key - The typography key
 * @param {TypographyStyle} style - The typography role
 * @returns {TypeStyle} The Design System type style
 */
function typeStyle(key, style) {
  /** @type {TypeStyle} */
  const entry = {
    name: toKebabCase(key),
    fontSize: style.fontSize,
    lineHeight: lineHeight(style.lineHeight),
    fontWeight: style.fontWeight,
  };
  if (style.letterSpacing !== undefined)
    entry.letterSpacing = style.letterSpacing;
  return entry;
}

/**
 * The `type` family: the theme's font families and one group of styles per family, in first-use order.
 * @param {ThemeInput} theme - The theme
 * @returns {{ fonts: never[], families: Record<string, string>, groups: { name: string, family: string | undefined, styles: TypeStyle[] }[] }} The type family
 */
function typeFamily(theme) {
  const families = theme.fontFamily ?? {};
  const familyKeys = Object.keys(families);
  const defaultFamily = "sans" in families ? "sans" : familyKeys[0];
  /** @type {Map<string | undefined, TypeStyle[]>} */
  const groups = new Map();
  for (const [key, style] of Object.entries(theme.typography ?? {})) {
    const family = resolveFamily(key, style, familyKeys, defaultFamily);
    const styles = groups.get(family) ?? [];
    styles.push(typeStyle(key, style));
    groups.set(family, styles);
  }
  return {
    fonts: [],
    families,
    groups: [...groups].map(([family, styles]) => ({
      name: family ? sentenceCase(family) : "Text",
      family,
      styles,
    })),
  };
}

/**
 * A `{ tokens }` family from `[name, value]` pairs, or undefined when there are none.
 * @param {[string, unknown][]} entries - Token names and values
 * @returns {DsFamily | undefined} The family
 */
function familyOf(entries) {
  return entries.length > 0
    ? { tokens: entries.map(([name, value]) => ({ name, value, usage: "" })) }
    : undefined;
}

/**
 * A `{ tokens }` family from one theme record, names prefixed.
 * @param {Record<string, string> | undefined} record - A theme category
 * @param {string} prefix - The token name prefix
 * @returns {DsFamily | undefined} The family, or undefined when the theme has none
 */
function simpleFamily(record, prefix) {
  return familyOf(
    Object.entries(record ?? {}).map(([key, value]) => [
      `${prefix}-${toKebabCase(key)}`,
      value,
    ]),
  );
}

/**
 * The `shadow` family: the base value plus each variant that overrides it.
 * @param {Record<string, string> | undefined} shadows - The theme's shadows
 * @param {Variant[]} variants - The theme's variants
 * @returns {DsFamily | undefined} The family
 */
function shadowFamily(shadows, variants) {
  return familyOf(
    Object.entries(shadows ?? {}).map(([key, base]) => [
      `shadow-${toKebabCase(key)}`,
      Object.fromEntries([
        [BASE_THEME.id, base],
        ...variants
          .filter((v) => v.override.shadows?.[key] !== undefined)
          .map((v) => [v.id, v.override.shadows[key]]),
      ]),
    ]),
  );
}

/**
 * The `spacing` family, names verbatim; an empty list still yields a family.
 * @param {DsSpacing[] | undefined} spacing - Spacing tokens
 * @returns {DsFamily | undefined} The family, or undefined when no list is given
 */
function spacingFamily(spacing) {
  if (!spacing) return undefined;
  return {
    tokens: spacing.map((s) => ({
      name: s.name,
      value: s.value,
      usage: s.usage ?? "",
    })),
  };
}

/**
 * Every family but `type` shares one `--<name>` namespace on the page, where a duplicate is dropped: throw instead.
 * @param {Record<string, unknown>} out - The tokens.json object
 */
function assertUniqueTokenNames(out) {
  /** @type {Map<string, string>} */
  const seen = new Map();
  for (const [family, group] of Object.entries(out)) {
    if (family === "type") continue;
    const tokens = /** @type {{ tokens?: unknown } | null} */ (group)?.tokens;
    if (!Array.isArray(tokens)) continue;
    for (const token of /** @type {DsToken[]} */ (tokens)) {
      const first = seen.get(token.name);
      if (first)
        throw new Error(
          `token name "${token.name}" is used by both ${first} and ${family}`,
        );
      seen.set(token.name, family);
    }
  }
}

/**
 * Maps a theme to a Design System `tokens.json` object.
 * @param {ThemeInput} theme - A theme as `generate()` accepts it
 * @param {DsTokensOptions} options - Title, usage lines and the families the theme does not hold
 * @returns {Record<string, unknown>} The tokens.json object, families in page order
 */
export function themeToDsTokens(
  theme,
  { name, usage = {}, spacing, opacities = [], screens = {} },
) {
  const variants = collectVariants(theme.themeAxes);
  /** @type {[string, unknown][]} */
  const entries = [
    ["name", name],
    ["version", 1],
    ["color", colorFamily(theme, variants, usage)],
    ["type", typeFamily(theme)],
    ["spacing", spacingFamily(spacing)],
    ["radius", simpleFamily(theme.borderRadius, "radius")],
    ["shadow", shadowFamily(theme.shadows, variants)],
    ["borderWidth", simpleFamily(theme.borderWidth, "border")],
    ["backdropBlur", simpleFamily(theme.backdropBlurs, "blur")],
    [
      "opacity",
      familyOf(
        opacities.map((step) => [`opacity-${step}`, String(step / 100)]),
      ),
    ],
    [
      "breakpoint",
      familyOf(
        Object.entries(screens).map(([key, value]) => [`bp-${key}`, value]),
      ),
    ],
  ];
  const out = Object.fromEntries(entries.filter(([, v]) => v !== undefined));
  assertUniqueTokenNames(out);
  return out;
}
