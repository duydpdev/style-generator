import { resolveOptions } from "../../core/resolveOptions";
import type { ResolvedOptions } from "../../core/resolveOptions";

/**
 * Generate a `@theme { --breakpoint-<key>: <value>; ... }` block overriding
 * Tailwind v4's own rem-based default breakpoint scale
 * (`--breakpoint-md: 48rem`, `--breakpoint-lg: 64rem`, ...) with the
 * library's pixel-based `defaultScreens` (merged with `options.screens`).
 *
 * Without it, `md:`/`lg:`/... utility variants would resolve against
 * Tailwind's defaults instead of the library's screens, changing every
 * responsive utility's breakpoint.
 *
 * Emitted unconditionally, independent of `enableResponsive`, which only
 * gates the spacing breakpoint var chain.
 * @param {Pick<ResolvedOptions, "screens">} [options] - Resolved generator options (`screens`)
 * @returns {string} `@theme { ... }` block
 */
export const generateScreensCss = (
  options: Pick<ResolvedOptions, "screens"> = resolveOptions(),
): string => {
  const allScreens = options.screens;

  const lines = Object.entries(allScreens).map(
    ([key, value]) => `  --breakpoint-${key}: ${value};`,
  );

  return `@theme {\n${lines.join("\n")}\n}\n`;
};
