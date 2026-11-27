/**
 * Contrast and ordering rules over the theme's colours: aliases are resolved
 * per variant (the base and every combination of `themeAxes` variants), translucent
 * colours are composited in sRGB onto `background` and `surface`, and ratios follow
 * WCAG 2.x relative luminance.
 */
import { parseAliasRef } from "../../../core/tokenGrammar";

import { asRecord } from "./parseHtml";
import type { Reporter } from "./ruleReport";
import type { LayeredStandard } from "./standardLayer";

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const HEX = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const MAX_COMBINATIONS = 256;

// `#rgb[a]` / `#rrggbb[aa]` → channels 0-255 and alpha 0-1.
function parseHex(value: string): Rgba {
  const digits = value.slice(1);
  const full = digits.length <= 4 ? digits.replace(/./g, (d) => d + d) : digits;
  const channel = (index: number) =>
    parseInt(full.slice(index * 2, index * 2 + 2), 16);
  return {
    r: channel(0),
    g: channel(1),
    b: channel(2),
    a: full.length === 8 ? channel(3) / 255 : 1,
  };
}

// An alpha as a number or a percentage; absent is opaque.
function parseAlpha(text: string | undefined): number {
  if (text === undefined) return 1;
  return text.endsWith("%") ? Number(text.slice(0, -1)) / 100 : Number(text);
}

// `rgb(r, g, b)`, `rgba(r, g, b, a)` and the space/slash form; null for anything else.
function parseRgbFunction(value: string): Rgba | null {
  if (!/^rgba?\(.*\)$/i.test(value)) return null;
  const parts = value
    .slice(value.indexOf("(") + 1, -1)
    .trim()
    .split(/[\s,/]+/)
    .filter(Boolean);
  if (parts.length < 3 || parts.length > 4) return null;
  const [r, g, b] = parts.slice(0, 3).map(Number);
  const alpha = parseAlpha(parts[3]);
  if ([r, g, b, alpha].some((n) => n === undefined || Number.isNaN(n)))
    return null;
  return { r: r ?? 0, g: g ?? 0, b: b ?? 0, a: alpha };
}

/**
 * A colour literal as channels, or null when it is not hex or `rgb()`.
 * @param {string} value - A CSS colour value
 * @returns {Rgba | null} The colour
 */
export function parseColor(value: string): Rgba | null {
  const text = value.trim();
  return HEX.test(text) ? parseHex(text) : parseRgbFunction(text);
}

/**
 * Resolves a theme colour to channels, following `$key` and `$key/<n>` aliases.
 * @param {string} key - A key of `colors`
 * @param {Record<string, unknown>} colors - The colours of one variant
 * @param {string[]} seen - Keys already followed, to stop a cycle
 * @returns {Rgba | null} The colour, or null when it cannot be measured
 */
export function resolveColor(
  key: string,
  colors: Record<string, unknown>,
  seen: string[] = [],
): Rgba | null {
  const value = colors[key];
  if (typeof value !== "string" || seen.includes(key)) return null;
  if (!value.startsWith("$")) return parseColor(value);
  const ref = parseAliasRef(value);
  if (ref === undefined) return null;
  const inner = resolveColor(ref.key, colors, [...seen, key]);
  if (inner === null) return null;
  return {
    ...inner,
    a: inner.a * (ref.alpha === undefined ? 1 : ref.alpha / 100),
  };
}

// Source-over in sRGB: the colour laid on an opaque backdrop.
const over = (top: Rgba, below: Rgba): Rgba => ({
  r: top.r * top.a + below.r * (1 - top.a),
  g: top.g * top.a + below.g * (1 - top.a),
  b: top.b * top.a + below.b * (1 - top.a),
  a: 1,
});

const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 1 };

const luminance = ({ r, g, b }: Rgba): number => {
  const linear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};

/**
 * WCAG 2.x contrast ratio of two opaque colours.
 * @param {Rgba} a - One colour
 * @param {Rgba} b - The other colour
 * @returns {number} The ratio, 1 to 21
 */
export function contrastRatio(a: Rgba, b: Rgba): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

interface Variant {
  label: string;
  colors: Record<string, unknown>;
}

/**
 * The base theme plus every combination of one variant (or none) per axis.
 * @param {Record<string, unknown>} theme - Parsed theme JSON
 * @returns {{ variants: Variant[]; truncated: boolean }} Each with the colours it resolves to
 */
function enumerateVariants(theme: Record<string, unknown>): {
  variants: Variant[];
  truncated: boolean;
} {
  let combos: { labels: string[]; colors: Record<string, unknown> }[] = [
    { labels: [], colors: asRecord(theme.colors) },
  ];
  for (const [axis, variants] of Object.entries(asRecord(theme.themeAxes))) {
    const options = Object.entries(asRecord(variants));
    combos = combos.flatMap((combo) => [
      combo,
      ...options.map(([name, override]) => ({
        labels: [...combo.labels, `${axis}=${name}`],
        colors: { ...combo.colors, ...asRecord(asRecord(override).colors) },
      })),
    ]);
  }
  const truncated = combos.length > MAX_COMBINATIONS;
  return {
    variants: combos.slice(0, MAX_COMBINATIONS).map((combo) => ({
      label: combo.labels.length === 0 ? "base" : combo.labels.join("+"),
      colors: combo.colors,
    })),
    truncated,
  };
}

interface Pair {
  rule: "contrast-text" | "contrast-focus";
  fg: string;
  bg: string;
  min: number;
}

const TEXT_TIERS = ["foreground", "foregroundSecondary", "mutedForeground"];
const TEXT_GROUNDS = ["background", "surface", "muted"];

// The foreground/background pairs a theme with these keys must keep readable.
function pairsOf(keys: readonly string[]): Pair[] {
  const pairs = new Map<string, Pair>();
  const add = (rule: Pair["rule"], fg: string, bg: string, min: number) => {
    if (keys.includes(fg) && keys.includes(bg))
      pairs.set(`${fg}/${bg}`, { rule, fg, bg, min });
  };
  // `<role>Foreground` on `<role>`, `<role>SubtleForeground` on `<role>Subtle`.
  for (const key of keys)
    if (key.endsWith("Foreground"))
      add("contrast-text", key, key.slice(0, -"Foreground".length), 4.5);
  for (const tier of TEXT_TIERS)
    for (const ground of TEXT_GROUNDS) add("contrast-text", tier, ground, 4.5);
  add("contrast-focus", "focus", "background", 3);
  return [...pairs.values()];
}

// Backdrops a translucent colour may sit on.
const BACKDROPS = ["background", "surface"];

/**
 * The worse ratio of `fg` on `bg` over the backdrops, or null when a colour is not measurable.
 * @param {string} fg - Text colour key
 * @param {string} bg - Ground colour key
 * @param {Record<string, unknown>} colors - The colours of one variant
 * @returns {number | null} The lowest ratio, or null when a colour cannot be measured
 */
function pairRatio(
  fg: string,
  bg: string,
  colors: Record<string, unknown>,
): number | null {
  const top = resolveColor(fg, colors);
  const ground = resolveColor(bg, colors);
  if (top === null || ground === null) return null;
  const ratios = BACKDROPS.map((name) => {
    const backdrop = over(resolveColor(name, colors) ?? WHITE, WHITE);
    const flatGround = over(ground, backdrop);
    return contrastRatio(over(top, flatGround), flatGround);
  });
  return Math.min(...ratios);
}

// The flattened colour of a key laid on `background`.
function flat(key: string, colors: Record<string, unknown>): Rgba | null {
  const colour = resolveColor(key, colors);
  const page = resolveColor("background", colors);
  return colour === null || page === null
    ? null
    : over(colour, over(page, WHITE));
}

interface Failure {
  rule: string;
  name: string;
  text: string;
  score: number;
  labels: string[];
}

const fixed = (n: number): string => n.toFixed(2);

// Order rules against `background`; null entries mean the keys are absent or not measurable.
function orderFailures(variant: Variant): Omit<Failure, "labels">[] {
  const { colors } = variant;
  const page = flat("background", colors);
  const out: Omit<Failure, "labels">[] = [];
  if (page === null) return out;
  const ratio = (key: string) => {
    const colour = flat(key, colors);
    return colour === null ? null : contrastRatio(colour, page);
  };
  for (let i = 1; i < TEXT_TIERS.length; i++) {
    const upper = TEXT_TIERS[i - 1] ?? "";
    const lower = TEXT_TIERS[i] ?? "";
    const [hi, lo] = [ratio(upper), ratio(lower)];
    if (hi !== null && lo !== null && lo > hi)
      out.push({
        rule: "order-text",
        name: lower,
        text: `${lower} (${fixed(lo)}:1) reads stronger than ${upper} (${fixed(hi)}:1) on background`,
        score: hi - lo,
      });
  }
  const [strong, soft] = [ratio("borderStrong"), ratio("border")];
  if (strong !== null && soft !== null && strong <= soft)
    out.push({
      rule: "order-border",
      name: "borderStrong",
      text: `borderStrong (${fixed(strong)}:1) is not stronger than border (${fixed(soft)}:1) on background`,
      score: strong - soft,
    });
  const [surface, raised] = [
    flat("surface", colors),
    flat("surfaceStrong", colors),
  ];
  if (surface !== null && raised !== null) {
    const [step, base] = [
      contrastRatio(raised, surface),
      contrastRatio(surface, page),
    ];
    if (step <= base)
      out.push({
        rule: "order-surface",
        name: "surfaceStrong",
        text: `surfaceStrong differs from surface by ${fixed(step)}:1, no more than surface from background (${fixed(base)}:1)`,
        score: step - base,
      });
  }
  return out;
}

/** The failures of a run, each with the variants it appeared in, and the pairs that could not be measured. */
interface Collected {
  failures: Map<string, Failure>;
  unmeasurable: Map<string, Pair>;
}

// Measures every pair and every ordering rule in every variant.
function collectFailures(
  variants: readonly Variant[],
  pairs: readonly Pair[],
): Collected {
  const failures = new Map<string, Failure>();
  const unmeasurable = new Map<string, Pair>();
  const note = (failure: Omit<Failure, "labels">, label: string) => {
    const id = `${failure.rule}|${failure.name}`;
    const known = failures.get(id);
    if (known === undefined) {
      failures.set(id, { ...failure, labels: [label] });
      return;
    }
    known.labels.push(label);
    if (failure.score < known.score)
      Object.assign(known, { text: failure.text, score: failure.score });
  };
  for (const variant of variants) {
    for (const failure of orderFailures(variant)) note(failure, variant.label);
    for (const pair of pairs) {
      const ratio = pairRatio(pair.fg, pair.bg, variant.colors);
      if (ratio === null) unmeasurable.set(`${pair.fg}/${pair.bg}`, pair);
      else if (ratio < pair.min)
        note(
          {
            rule: pair.rule,
            name: `${pair.fg}/${pair.bg}`,
            text: `${pair.fg} on ${pair.bg} is ${fixed(ratio)}:1, below ${String(pair.min)}:1`,
            score: ratio,
          },
          variant.label,
        );
    }
  }
  return { failures, unmeasurable };
}

/**
 * The ordering and contrast rules of a theme's colours.
 * @param {Record<string, unknown>} theme - Parsed theme JSON
 * @param {LayeredStandard} standard - The standard with the product's additions
 * @param {Reporter} reporter - Receives the lines
 * @param {string} path - `<theme>:1`, the location every line names
 */
export function contrastRules(
  theme: Record<string, unknown>,
  standard: LayeredStandard,
  reporter: Reporter,
  path: string,
): void {
  const { variants, truncated } = enumerateVariants(theme);
  const pairs = pairsOf(Object.keys(asRecord(theme.colors)));
  const { failures, unmeasurable } = collectFailures(variants, pairs);
  const exceptions = standard.exceptions?.contrast ?? [];
  const used = new Set<string>();
  for (const failure of failures.values()) {
    if (
      failure.rule.startsWith("contrast-") &&
      exceptions.some((entry) => entry.pair === failure.name)
    ) {
      used.add(failure.name);
      continue;
    }
    const where =
      failure.labels.length === 1 && failure.labels[0] === "base"
        ? ""
        : ` (in ${failure.labels.join(", ")})`;
    reporter.error(path, `${failure.text}${where}`, failure.rule, failure.name);
  }
  for (const [name, pair] of unmeasurable)
    reporter.finding(
      path,
      `${pair.fg} on ${pair.bg} is not measurable: a value is not hex, rgb() or an alias of one`,
      pair.rule,
      name,
    );
  if (truncated)
    reporter.finding(
      path,
      `themeAxes give more than ${String(MAX_COMBINATIONS)} combinations; the first ${String(MAX_COMBINATIONS)} were measured`,
      "contrast-text",
    );
  for (const entry of exceptions)
    if (!used.has(entry.pair))
      reporter.finding(
        path,
        `contrast exception ${entry.pair} matches no failing pair; remove it`,
        "contrast-text",
        entry.pair,
      );
}
