import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import type { ElementType } from "react";

import type { badgeIntents } from "./style";

export interface BadgeOwnProps {
  readonly color?: (typeof badgeIntents)[number] | undefined;
  readonly variant?: "soft" | "solid" | "outline" | undefined;
  readonly className?: string | undefined;
}

export type BadgeProps<T extends ElementType = "span"> = Polymorphic<
  T,
  BadgeOwnProps
>;
