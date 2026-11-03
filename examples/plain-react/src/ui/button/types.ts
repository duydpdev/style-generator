import type { ThemeSpacingProps } from "@duydpdev/style-generator/ui";
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import type { CSSProperties, ElementType, ReactNode } from "react";

import type { tokens } from "../../theme";

import type { ButtonIntent } from "./style";

export type ButtonOwnProps = ThemeSpacingProps<typeof tokens> & {
  readonly variant?: "fill" | "outline" | "soft" | "ghost" | "link" | undefined;
  /** One of `buttonIntents`. */
  readonly color?: ButtonIntent | undefined;
  readonly size?: "sm" | "md" | "lg" | undefined;
  readonly prefix?: ReactNode;
  readonly suffix?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
};

export type ButtonProps<T extends ElementType = "button"> = Polymorphic<
  T,
  ButtonOwnProps
>;
