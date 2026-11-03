import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import type { ElementType } from "react";

import type { tokens } from "../../theme";

type Tokens = typeof tokens;

export interface CardOwnProps {
  readonly tone?: "surface" | "muted" | "outline" | undefined;
  readonly padding?: "none" | "sm" | "md" | "lg" | undefined;
  readonly radius?: Tokens["borderRadius"][number] | undefined;
  readonly shadow?: Tokens["shadows"][number] | "none" | undefined;
  readonly border?: Tokens["borderWidth"][number] | "none" | undefined;
  readonly className?: string | undefined;
}

export type CardProps<T extends ElementType = "div"> = Polymorphic<
  T,
  CardOwnProps
>;
