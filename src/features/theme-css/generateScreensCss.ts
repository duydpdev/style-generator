import { resolveOptions } from "../../core/resolveOptions";
import type { ResolvedOptions } from "../../core/resolveOptions";
import { cssBlock } from "../../shared/cssBlock";

/**
 * Generates the `@theme` `--breakpoint-*` block that replaces Tailwind's rem
 * scale with the resolved `screens`, so `md:`/`lg:` match the library's
 * breakpoints. Emitted regardless of `enableResponsive`.
 * @param {Pick<ResolvedOptions, "screens">} [options] - Resolved generator options
 * @returns {string} `@theme { ... }` block
 */
export const generateScreensCss = (
  options: Pick<ResolvedOptions, "screens"> = resolveOptions(),
): string => {
  const allScreens = options.screens;

  const lines = Object.entries(allScreens).map(
    ([key, value]) => `  --breakpoint-${key}: ${value};`,
  );

  return cssBlock("@theme", lines.join("\n")) + "\n";
};
