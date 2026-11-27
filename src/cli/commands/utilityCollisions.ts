import type { ThemeConfig } from "../../core/themeSchema";
import {
  motionDurationCategory,
  motionEasingCategory,
  zIndexCategory,
} from "../../features/registry/builtInCategories";
import { toKebabCase } from "../../shared/helpers";

// Curated `text-<name>` statics a typography key can shadow: only names stable across Tailwind v4.
const TAILWIND_TEXT_UTILITY_RE =
  /^text-(xs|sm|base|lg|xl|[2-9]xl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)$/;

/**
 * Tailwind functional utilities that accept a bare integer: a typography key
 * like `h1` (→ `h-1`) emits a class Tailwind owns. Each root is proven in
 * `src/__integration__/utility-collisions.test.ts`.
 */
export const TAILWIND_NUMERIC_UTILITY_ROOTS = [
  "h",
  "w",
  "size",
  "min-h",
  "min-w",
  "max-h",
  "max-w",
  "p",
  "px",
  "py",
  "pt",
  "pr",
  "pb",
  "pl",
  "m",
  "mx",
  "my",
  "mt",
  "mr",
  "mb",
  "ml",
  "gap",
  "inset",
  "top",
  "right",
  "bottom",
  "left",
  "z",
  "order",
  "columns",
  "basis",
  "indent",
  "leading",
  "opacity",
  "border",
  "rotate",
  "scale",
  "col-span",
  "row-span",
  "grid-cols",
  "grid-rows",
  "line-clamp",
] as const;

/** Tailwind static utilities a typography key can be named after (`italic`, `truncate`). */
export const TAILWIND_STATIC_UTILITY_NAMES = [
  "italic",
  "underline",
  "overline",
  "uppercase",
  "lowercase",
  "capitalize",
  "truncate",
  "antialiased",
  "ordinal",
  "block",
  "inline",
  "flex",
  "grid",
  "hidden",
  "container",
  "border",
  "rounded",
  "shadow",
  "outline",
  "grow",
  "shrink",
  "static",
  "fixed",
  "sticky",
  "visible",
  "invisible",
] as const;

const TAILWIND_NUMERIC_UTILITY_RE = new RegExp(
  `^(${TAILWIND_NUMERIC_UTILITY_ROOTS.join("|")})-\\d+$`,
);
const TAILWIND_STATIC_UTILITY_SET: ReadonlySet<string> = new Set(
  TAILWIND_STATIC_UTILITY_NAMES,
);

/**
 * Statics a `colors` key shadows through `ring`/`outline`/`divide`
 * (`colors.solid` → `outline-solid`); `*-none` is left to the `none` check.
 */
export const TAILWIND_COLOR_STATIC_CLASSES = [
  "ring-inset",
  "outline-hidden",
  "outline-solid",
  "outline-dashed",
  "outline-dotted",
  "outline-double",
  "divide-solid",
  "divide-dashed",
  "divide-dotted",
  "divide-double",
  "divide-x-reverse",
  "divide-y-reverse",
] as const;

/** Tailwind width/offset roots of the color prefixes that take a bare integer (`ring-3`, `outline-offset-2`). */
export const TAILWIND_COLOR_NUMERIC_ROOTS = [
  "ring",
  "outline",
  "ring-offset",
  "outline-offset",
] as const;

const COLOR_STATIC_SET: ReadonlySet<string> = new Set(
  TAILWIND_COLOR_STATIC_CLASSES,
);
const COLOR_NUMERIC_RE = new RegExp(
  `^(${TAILWIND_COLOR_NUMERIC_ROOTS.join("|")})-\\d+$`,
);
const COLOR_STATIC_PREFIXES = ["ring", "outline", "divide"] as const;

const isTailwindUtilityName = (utilityName: string): boolean =>
  TAILWIND_TEXT_UTILITY_RE.test(utilityName) ||
  TAILWIND_NUMERIC_UTILITY_RE.test(utilityName) ||
  TAILWIND_STATIC_UTILITY_SET.has(utilityName);

const TAILWIND_COLOR_KEYWORD_RE = /^(transparent|current|inherit)$/;

// Keyword line first, then the `ring`/`outline`/`divide` classes the key shadows.
const colorKeyCollisions = (key: string): string[] => {
  const warnings: string[] = [];
  if (TAILWIND_COLOR_KEYWORD_RE.test(key)) {
    warnings.push(
      `colors.${key} → collides with Tailwind's built-in "${key}" color`,
    );
  }
  const kebab = toKebabCase(key);
  for (const prefix of COLOR_STATIC_PREFIXES) {
    const cls = `${prefix}-${kebab}`;
    if (COLOR_STATIC_SET.has(cls) || COLOR_NUMERIC_RE.test(cls)) {
      warnings.push(
        `colors.${key} → class "${cls}" collides with Tailwind's built-in "${cls}" utility`,
      );
    }
  }
  return warnings;
};

/**
 * Scale categories whose prefix Tailwind owns: its statics and whether it takes
 * a bare integer. `opacity` is absent: the schema rejects digit-only keys.
 */
export const TAILWIND_SCALE_COLLISIONS = [
  { category: zIndexCategory, statics: ["auto"], numeric: true },
  { category: motionDurationCategory, statics: ["initial"], numeric: true },
  {
    category: motionEasingCategory,
    statics: ["linear", "in", "out", "in-out", "initial"],
    numeric: false,
  },
] as const;

const scaleKeyCollisions = (theme: ThemeConfig): string[] => {
  const warnings: string[] = [];
  for (const { category, statics, numeric } of TAILWIND_SCALE_COLLISIONS) {
    const owned: ReadonlySet<string> = new Set(statics);
    for (const key of Object.keys(theme[category.key] ?? {})) {
      const kebab = toKebabCase(key);
      if (owned.has(kebab) || (numeric && /^\d+$/.test(kebab))) {
        const cls = `${category.classPrefixes[0]}-${kebab}`;
        warnings.push(
          `${category.key}.${key} → class "${cls}" collides with Tailwind's built-in "${cls}" utility`,
        );
      }
    }
  }
  return warnings;
};

/** Categories whose `none` key shadows Tailwind's `<prefix>-none` utility. */
const NONE_COLLIDING_CATEGORIES = [
  "colors",
  "shadows",
  "backdropBlurs",
  "borderRadius",
] as const;

// Rationale: documents/architecture.md#utilitycollisionsts-why-collisions-are-warnings-only
/**
 * Warnings for schema-valid theme keys whose generated class shadows (or is
 * shadowed by) a Tailwind utility: `none` keys, digit-only `borderWidth`,
 * typography, color and scale keys. `themeAxes` overrides are not inspected.
 * @param {ThemeConfig} theme - A theme that already passed `ThemeSchema`
 * @returns {string[]} One human-readable `path → message` line per collision
 */
export const findUtilityCollisions = (theme: ThemeConfig): string[] => {
  const warnings: string[] = [];

  for (const category of NONE_COLLIDING_CATEGORIES) {
    const record = theme[category];
    if (record && Object.hasOwn(record, "none")) {
      warnings.push(
        `${category}.none → collides with Tailwind's "-none" utility of the same prefix`,
      );
    }
  }

  for (const key of Object.keys(theme.colors)) {
    warnings.push(...colorKeyCollisions(key));
  }

  for (const key of Object.keys(theme.borderWidth ?? {})) {
    if (/^\d+$/.test(key)) {
      warnings.push(
        `borderWidth.${key} → digit-only key overrides Tailwind's built-in "border-${key}" width (also border-x/divide-x)`,
      );
    }
  }

  warnings.push(...scaleKeyCollisions(theme));

  for (const key of Object.keys(theme.typography ?? {})) {
    const kebab = toKebabCase(key);
    if (isTailwindUtilityName(kebab)) {
      warnings.push(
        `typography.${key} → "@utility ${kebab}" collides with Tailwind's "${kebab}" utility`,
      );
    }
  }

  return warnings;
};
