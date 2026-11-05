import type { ThemeSpacingProps } from "@duydpdev/style-generator/ui";
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import type { CSSProperties, ElementType } from "react";

import type { tokens } from "../../theme";

type Tokens = typeof tokens;

/** A color token, or `token/step` with a step from `coverage.colors.opacities`. */
type ColorValue =
  | Tokens["colors"][number]
  | `${Tokens["colors"][number]}/${Tokens["opacities"][number]}`;

export type TextOwnProps = ThemeSpacingProps<Tokens> & {
  readonly type?: Tokens["typography"][number] | undefined;
  readonly color?: ColorValue | undefined;
  readonly align?: "left" | "center" | "right" | undefined;
  readonly decoration?: "underline" | "lineThrough" | "none" | undefined;
  readonly transform?:
    | "uppercase"
    | "lowercase"
    | "capitalize"
    | "normalCase"
    | undefined;
  readonly italic?: boolean | undefined;
  readonly truncate?: boolean | undefined;
  readonly lineClamp?: 1 | 2 | 3 | 4 | 5 | 6 | "none" | undefined;
  readonly wrap?: "wrap" | "nowrap" | "balance" | "pretty" | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
};

export type TextProps<T extends ElementType = "p"> = Polymorphic<
  T,
  TextOwnProps
>;
