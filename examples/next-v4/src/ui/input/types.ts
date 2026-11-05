import type { ComponentPropsWithRef } from "react";

import type { tokens } from "../../theme";

type Tokens = typeof tokens;

/** A color token, or `token/step` with a step from `coverage.colors.opacities`. */
type ColorValue =
  | Tokens["colors"][number]
  | `${Tokens["colors"][number]}/${Tokens["opacities"][number]}`;

export interface InputOwnProps {
  /** Control height and text size; replaces the native `size` attribute. */
  readonly size?: "sm" | "md" | "lg" | undefined;
  /** Placeholder text colour (a token or `token/step`); default `muted`. */
  readonly placeholderColor?: ColorValue | undefined;
  /** `true` renders `aria-invalid="true"` (and the invalid border). */
  readonly invalid?: boolean | undefined;
  readonly className?: string | undefined;
}

export type InputProps = InputOwnProps &
  Omit<ComponentPropsWithRef<"input">, keyof InputOwnProps>;
