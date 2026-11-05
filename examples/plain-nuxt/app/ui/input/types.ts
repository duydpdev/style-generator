import type { tokens } from "../../theme";

/** A color token, or `token/step` with a step from `coverage.colors.opacities`. */
type ColorValue =
  | (typeof tokens)["colors"][number]
  | `${(typeof tokens)["colors"][number]}/${(typeof tokens)["opacities"][number]}`;

export interface InputProps {
  /** Control height and text size; replaces the native `size` attribute. */
  size?: "sm" | "md" | "lg";
  /** Placeholder text colour (a token or `token/step`); default `muted`. */
  placeholderColor?: ColorValue;
  /** `true` renders `aria-invalid="true"` (and the invalid border). */
  invalid?: boolean;
}
