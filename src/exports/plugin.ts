/**
 * Subpath: `@duydpdev/style-generator/plugin`
 *
 * Plugin construction + safelist + theme CSS generation. Use this when you only
 * need the Tailwind plugin/CSS pipeline (most common consumer subset).
 */
export { createStyleSystem } from "../core/createStyleSystem";
export { createStylePlugin } from "../features/plugin/createStylePlugin";
export type { TailwindPlugin } from "../features/plugin/createStylePlugin";
export { generateSafelist } from "../features/safelist/generateSafelist";
export { generateThemeCss } from "../features/theme-css/generateThemeCss";
export { detectTailwindVersion } from "../shared/detectTailwindVersion";
