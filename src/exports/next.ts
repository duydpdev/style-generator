/**
 * Subpath: `@duydpdev/style-generator/next`
 *
 * Next.js config wrapper that emits `theme.css` from a theme JSON on config
 * evaluation. Works under both webpack and Turbopack — it does not import
 * `next`, so no peer dependency is added.
 */
export {
  styleGenNext,
  type StyleGenNextOptions,
} from "../features/next/styleGenNext";
