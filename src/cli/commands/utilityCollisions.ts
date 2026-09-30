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
 * - digit-only `borderWidth` keys (`border-0`, `border-2`, ...);
 * - `typography` keys kebab-casing to `text-xs`…`text-9xl`, text-align,
 *   text-wrap or text-overflow utilities;
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
        `borderWidth.${key} → digit-only key collides with Tailwind's "border-${key}" width utility`,
      );
    }
  }

  for (const key of Object.keys(theme.typography ?? {})) {
    const kebab = toKebabCase(key);
    if (TAILWIND_TEXT_UTILITY_RE.test(kebab)) {
      warnings.push(
        `typography.${key} → "@utility ${kebab}" collides with Tailwind's static "${kebab}" utility`,
      );
    }
  }

  return warnings;
};
