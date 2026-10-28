import { generateSourceInline } from "../features/registry/generateSourceInline";
import { generateSpacingCss } from "../features/spacing/generateSpacingCss";
import { generateScreensCss } from "../features/theme-css/generateScreensCss";
import { buildThemeCss } from "../features/theme-css/generateThemeCss";
import { generateTypographyCss } from "../features/typography/generateTypographyCss";

import type { ResolvedOptions } from "./resolveOptions";
import type { ThemeConfig } from "./themeSchema";

/**
 * The CSS half of `generate()`: join the screens `@theme`, the theme vars +
 * `@theme inline` mapping, the typography and spacing `@utility` blocks and
 * the registry's `@source inline` lines. Does no validation: `parsed` and
 * `resolved` must come from `prepareGenerate`. Internal: not exported from
 * any barrel.
 * @param {ThemeConfig} parsed - Theme already validated
 * @param {ResolvedOptions} resolved - Options already resolved
 * @returns {string} The complete CSS string
 */
export const generateFromParsed = (
  parsed: ThemeConfig,
  resolved: ResolvedOptions,
): string =>
  [
    generateScreensCss(resolved),
    buildThemeCss(parsed, resolved),
    generateTypographyCss(parsed.typography, resolved),
    generateSpacingCss(resolved),
    generateSourceInline(parsed, resolved),
  ]
    .filter((block) => block.length > 0)
    .join("\n");
