/**
 * Maps a style-generator theme to the `tokens.json` of a claude.ai Design System artifact.
 * Pure: no file I/O. The shape follows the Design System type's `reference/format.md`:
 * every family but `type` is `{ tokens: [{ name, value, usage }] }`, `color` also has
 * `themes`, and a color alias is written `"{other-token}"`.
 */
import { toKebabCase } from "../../../shared/helpers";

export interface DsToken {
  name: string;
  value: unknown;
  usage: string;
}
export interface DsFamily {
  tokens: DsToken[];
}
export interface DsSpacing {
  name: string;
  value: string;
  usage?: string;
}
export interface TypographyStyle {
  fontSize: string;
  lineHeight: string | number;
  fontWeight: number;
  letterSpacing?: string;
  fontFamily?: string;
}
interface TypeStyle {
  name: string;
  fontSize: string;
  lineHeight: string | number;
  fontWeight: number;
  letterSpacing?: string;
}
type ThemeOverride = Record<string, Record<string, string>>;

/** The theme fields the design system reads. */
export interface ThemeInput {
  colors: Record<string, string>;
  typography?: Record<string, TypographyStyle> | undefined;
  shadows?: Record<string, string> | undefined;
  backdropBlurs?: Record<string, string> | undefined;
  borderRadius?: Record<string, string> | undefined;
  fontFamily?: Record<string, string> | undefined;
  borderWidth?: Record<string, string> | undefined;
  controlHeight?: Record<string, string> | undefined;
  themeAxes?: Record<string, Record<string, ThemeOverride>> | undefined;
}

interface Variant {
  id: string;
  name: string;
  override: ThemeOverride;
}

export interface DsTokensOptions {
  /** The design system's title. */
  name: string;
  /** One usage line per theme color key. */
  usage?: Record<string, string>;
  /** Spacing tokens, names used verbatim. */
  spacing?: DsSpacing[] | undefined;
  /** Opacity steps (1–100) of `coverage.colors.opacities`. */
  opacities?: readonly number[];
  /** Breakpoint name → min width, one entry per covered breakpoint. */
  screens?: Record<string, string>;
}

const BASE_THEME = { id: "light", name: "Light" };

// `highContrast` → `High contrast`.
function sentenceCase(key: string): string {
  const words = toKebabCase(key).replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const ALPHA_ALIAS = /^\$([A-Za-z0-9][A-Za-z0-9-]*)\/(100|[1-9]\d?)$/;

// The literal `rgba(...)` of a hex colour at a percent; undefined when `hex` is not a 3, 6 or 8 digit hex.
function hexAtPercent(hex: string, percent: number): string | undefined {
  const digits = /^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i.exec(hex)?.[1];
  if (!digits) return undefined;
  const full =
    digits.length === 3 ? Array.from(digits, (d) => d + d).join("") : digits;
  const [r, g, b] = [0, 2, 4].map((i) =>
    Number.parseInt(full.slice(i, i + 2), 16),
  );
  const own =
    full.length === 8 ? Number.parseInt(full.slice(6, 8), 16) / 255 : 1;
  const alpha = Number(((percent / 100) * own).toFixed(4));
  return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(alpha)})`;
}

// The hex a colour key ends at in one theme, following plain `$alias` chains; undefined for a non-hex or translucent end.
function hexOf(
  key: string,
  colors: Record<string, string>,
): string | undefined {
  let value = colors[key];
  for (let hops = 0; hops <= Object.keys(colors).length; hops += 1) {
    if (value === undefined || ALPHA_ALIAS.test(value)) return undefined;
    if (!value.startsWith("$"))
      return value.startsWith("#") ? value : undefined;
    value = colors[value.slice(1)];
  }
  return undefined;
}

// A `$alias` becomes the type's alias form; `$<key>/<n>` a literal `rgba(...)` of the target's hex in this
// theme (the page reads no `color-mix`), or stays `color-mix(...)` for a non-hex target; a hex is lowercased.
function colorValue(value: string, colors: Record<string, string>): string {
  const alpha = ALPHA_ALIAS.exec(value);
  if (alpha) {
    const [, key = "", percent = "0"] = alpha;
    const hex = hexOf(key, colors);
    const literal =
      hex === undefined ? undefined : hexAtPercent(hex, Number(percent));
    if (literal) return literal;
    return `color-mix(in srgb, var(--sg-color-${toKebabCase(key)}) ${percent}%, transparent)`;
  }
  if (value.startsWith("$")) return `{${toKebabCase(value.slice(1))}}`;
  return /^#[\da-f]+$/i.test(value) ? value.toLowerCase() : value;
}

// `"150%"` → `1.5`; any other line height is kept.
function lineHeight(value: string | number): string | number {
  const percent = /^(\d+(?:\.\d+)?)%$/.exec(String(value));
  return percent ? Number(percent[1]) / 100 : value;
}

// Every variant of every axis in declaration order; a duplicate theme id throws.
function collectVariants(themeAxes: ThemeInput["themeAxes"]): Variant[] {
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

// The `color` family: one theme per variant, one value per theme (the override, else the base value).
function colorFamily(
  theme: ThemeInput,
  variants: Variant[],
  usage: Record<string, string>,
): { themes: { id: string; name: string }[]; tokens: DsToken[] } {
  const baseColors = theme.colors;
  const colorsOf = (variant: Variant): Record<string, string> => ({
    ...baseColors,
    ...variant.override.colors,
  });
  return {
    themes: [BASE_THEME, ...variants.map(({ id, name }) => ({ id, name }))],
    tokens: Object.entries(theme.colors).map(([key, base]) => ({
      name: toKebabCase(key),
      value: Object.fromEntries([
        [BASE_THEME.id, colorValue(base, baseColors)],
        ...variants.map((v): [string, string] => [
          v.id,
          colorValue(v.override.colors?.[key] ?? base, colorsOf(v)),
        ]),
      ]),
      usage: usage[key] ?? "",
    })),
  };
}

// The family key a typography role uses: its own `var(--sg-font-<key>)`, else the default family.
function resolveFamily(
  key: string,
  style: TypographyStyle,
  familyKeys: string[],
  defaultFamily: string | undefined,
): string | undefined {
  const own = /^var\(--sg-font-([\w-]+)\)$/.exec(style.fontFamily ?? "")?.[1];
  if (!own) return defaultFamily;
  const family = familyKeys.find((k) => toKebabCase(k) === own);
  if (!family)
    throw new Error(`typography.${key} uses an unknown font family "${own}"`);
  return family;
}

// One type style; `letterSpacing` only when the role sets it.
function typeStyle(key: string, style: TypographyStyle): TypeStyle {
  const entry: TypeStyle = {
    name: toKebabCase(key),
    fontSize: style.fontSize,
    lineHeight: lineHeight(style.lineHeight),
    fontWeight: style.fontWeight,
  };
  if (style.letterSpacing !== undefined)
    entry.letterSpacing = style.letterSpacing;
  return entry;
}

// The `type` family: the theme's font families and one group of styles per family, in first-use order.
function typeFamily(theme: ThemeInput): {
  fonts: never[];
  families: Record<string, string>;
  groups: {
    name: string;
    family: string | undefined;
    styles: TypeStyle[];
  }[];
} {
  const families = theme.fontFamily ?? {};
  const familyKeys = Object.keys(families);
  const defaultFamily = "sans" in families ? "sans" : familyKeys[0];
  const groups = new Map<string | undefined, TypeStyle[]>();
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

// A `{ tokens }` family from `[name, value]` pairs, or undefined when there are none.
function familyOf(entries: [string, unknown][]): DsFamily | undefined {
  return entries.length > 0
    ? { tokens: entries.map(([name, value]) => ({ name, value, usage: "" })) }
    : undefined;
}

// A `{ tokens }` family from one theme record, names prefixed.
function simpleFamily(
  record: Record<string, string> | undefined,
  prefix: string,
): DsFamily | undefined {
  return familyOf(
    Object.entries(record ?? {}).map(([key, value]) => [
      `${prefix}-${toKebabCase(key)}`,
      value,
    ]),
  );
}

// The `shadow` family: the base value plus each variant that overrides it.
function shadowFamily(
  shadows: Record<string, string> | undefined,
  variants: Variant[],
): DsFamily | undefined {
  return familyOf(
    Object.entries(shadows ?? {}).map(([key, base]) => [
      `shadow-${toKebabCase(key)}`,
      Object.fromEntries([
        [BASE_THEME.id, base],
        ...variants.flatMap((v) => {
          const own = v.override.shadows?.[key];
          return own === undefined ? [] : [[v.id, own]];
        }),
      ]),
    ]),
  );
}

// The `spacing` family, names verbatim; an empty list still yields a family.
function spacingFamily(spacing: DsSpacing[] | undefined): DsFamily | undefined {
  if (!spacing) return undefined;
  return {
    tokens: spacing.map((s) => ({
      name: s.name,
      value: s.value,
      usage: s.usage ?? "",
    })),
  };
}

// Every family but `type` shares one `--<name>` namespace on the page, where a duplicate is dropped: throw instead.
function assertUniqueTokenNames(out: Record<string, unknown>): void {
  const seen = new Map<string, string>();
  for (const [family, group] of Object.entries(out)) {
    if (family === "type") continue;
    const tokens = (group as { tokens?: unknown } | null)?.tokens;
    if (!Array.isArray(tokens)) continue;
    for (const token of tokens as DsToken[]) {
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
  theme: ThemeInput,
  { name, usage = {}, spacing, opacities = [], screens = {} }: DsTokensOptions,
): Record<string, unknown> {
  const variants = collectVariants(theme.themeAxes);
  const entries: [string, unknown][] = [
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
        opacities.map((step) => [
          `opacity-${String(step)}`,
          String(step / 100),
        ]),
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
