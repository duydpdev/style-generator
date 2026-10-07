import type { ThemeConfig } from "../../core/themeSchema";
import { toKebabCase } from "../../shared/helpers";

/**
 * Tailwind `text-<name>` static utilities a `theme.typography` key can shadow
 * (font-size scale + text-align + text-wrap + text-overflow). Curated, not
 * exhaustive: only names whose meaning is unambiguous and stable across
 * Tailwind v4.
 */
const TAILWIND_TEXT_UTILITY_RE =
  /^text-(xs|sm|base|lg|xl|[2-9]xl|left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)$/;

/**
 * Tailwind functional utilities that accept a bare integer (`h-1`, `z-10`).
 * A typography key kebab-casing to `<root>-<digits>` (`h1` → `h-1`, `p2` →
 * `p-2`) emits an `@utility` with the class Tailwind already owns. Every
 * root is proven against the real compiler in
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

/**
 * Tailwind static utilities a typography key can be named after (`italic`,
 * `underline`, `truncate`). Proven against the real compiler like
 * {@link TAILWIND_NUMERIC_UTILITY_ROOTS}.
 */
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
 * Whether a typography `@utility` name is also a Tailwind utility class.
 * @param {string} utilityName - Kebab-cased typography key
 * @returns {boolean} `true` when Tailwind ships a utility with that class
 */
const isTailwindUtilityName = (utilityName: string): boolean =>
  TAILWIND_TEXT_UTILITY_RE.test(utilityName) ||
  TAILWIND_NUMERIC_UTILITY_RE.test(utilityName) ||
  TAILWIND_STATIC_UTILITY_SET.has(utilityName);

const TAILWIND_COLOR_KEYWORD_RE = /^(transparent|current|inherit)$/;

/** Categories whose `none` key shadows Tailwind's `<prefix>-none` utility. */
const NONE_COLLIDING_CATEGORIES = [
  "colors",
  "shadows",
  "backDropBlurs",
  "borderRadius",
] as const;

/**
 * Warnings for theme keys that are schema-valid but collide with a Tailwind
 * static utility, so the generated `@theme`/`@utility` output silently
 * overrides (or is overridden by) the built-in class:
 * - `none` in colors/shadows/backDropBlurs/borderRadius (`bg-none`,
 *   `shadow-none`, `backdrop-blur-none`, `rounded-none`);
 * - digit-only `borderWidth` keys (`border-0`, `border-2`, ...): the theme value
 *   replaces Tailwind's built-in width, so this is an override to confirm;
 * - `typography` keys kebab-casing to a Tailwind utility class: `text-xs`…
 *   `text-9xl`, text-align/wrap/overflow, a numeric functional utility
 *   (`h1` → `h-1`) or a static one (`italic`, `truncate`);
 * - `colors` keys `transparent` / `current` / `inherit`.
 *
 * `themeAxes` overrides are not inspected separately: the schema requires
 * every override key to exist in the base theme, so a colliding key is always
 * reported once through the base record. Warnings only — a collision can be
 * intentional, so it never becomes a schema error.
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
    if (TAILWIND_COLOR_KEYWORD_RE.test(key)) {
      warnings.push(
        `colors.${key} → collides with Tailwind's built-in "${key}" color`,
      );
    }
  }

  for (const key of Object.keys(theme.borderWidth ?? {})) {
    if (/^\d+$/.test(key)) {
      warnings.push(
        `borderWidth.${key} → digit-only key overrides Tailwind's built-in "border-${key}" width (also border-x/divide-x)`,
      );
    }
  }

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
