/**
 * Subpath: `@duydpdev/style-generator/spacing`
 *
 * Runtime spacing helpers + default property table. Use in React/Vue components
 * that build inline-style spacing without bundling the full library.
 */
export {
  resolveSpacing,
  resolveSpacingProps,
} from "../features/spacing/spacingHelpers";
export type {
  ResponsiveValue,
  DefaultBreakpointKeys,
} from "../features/spacing/spacingHelpers";
export { DEFAULT_SPACING_PROPERTIES } from "../shared/defaultOption";
