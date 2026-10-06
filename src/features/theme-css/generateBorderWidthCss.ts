import type { ThemeConfig } from "../../core/themeSchema";
import { borderWidthCategory } from "../registry/builtInCategories";
import { toKebabCase } from "../../shared/helpers";
import { borderProperties } from "../../shared/safelistProperties";

/**
 * CSS longhand propert(y/ies) each `border*` class prefix maps to. Tailwind
 * v4 has no `--border-width-*` theme namespace — `border-2`, `border-4`, …
 * resolve against a fixed built-in scale, not a theme-configurable one —
 * so a themed `borderWidth` key needs its own explicit `@utility` per side
 * instead of a `@theme inline` mapping.
 */
const SIDE_PROPERTIES: Readonly<Record<string, readonly string[]>> = {
  border: ["border-width"],
  "border-x": ["border-left-width", "border-right-width"],
  "border-y": ["border-top-width", "border-bottom-width"],
  "border-t": ["border-top-width"],
  "border-r": ["border-right-width"],
  "border-b": ["border-bottom-width"],
  "border-l": ["border-left-width"],
};

/**
 * Generate `@utility <prefix>-<kebab-key> { <longhand>: var(--sg-border-width-<kebab-key>); ... }`
 * for every `theme.borderWidth` key, one block per side prefix (all 7 of
 * `borderProperties`: `border`, `border-x`, `border-y`, `border-t`,
 * `border-r`, `border-b`, `border-l`), using the correct CSS longhand(s)
 * per side (`border-x` sets both `border-left-width` and
 * `border-right-width`, etc.).
 *
 * Emits nothing when the theme omits `borderWidth` — Tailwind's own
 * built-in border-width scale (`border-2`, `border-4`, …) covers that
 * case instead, surfaced only through `generateSourceInline`'s
 * `defaultValues` fallback (`DEFAULT_BORDER_VALUES`), with no custom
 * `@utility` needed.
 * @param {ThemeConfig} theme - Theme configuration
 * @returns {string} CSS string, empty when `theme.borderWidth` is absent/empty
 */
export const generateBorderWidthCss = (theme: ThemeConfig): string => {
  const borderWidth = theme.borderWidth;
  if (!borderWidth || Object.keys(borderWidth).length === 0) return "";

  const cssVarPrefix = borderWidthCategory.cssVarPrefix;

  const blocks: string[] = [];
  for (const key of Object.keys(borderWidth)) {
    const kebabKey = toKebabCase(key);
    const varRef = `var(--${cssVarPrefix}-${kebabKey})`;

    for (const prefix of borderProperties) {
      const cssProps = SIDE_PROPERTIES[prefix];
      if (!cssProps) continue;

      const lines = cssProps.map((prop) => `  ${prop}: ${varRef};`).join("\n");
      blocks.push(`@utility ${prefix}-${kebabKey} {\n${lines}\n}`);
    }
  }

  return blocks.join("\n\n") + "\n";
};
