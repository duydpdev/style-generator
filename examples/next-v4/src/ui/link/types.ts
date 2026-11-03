import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import type { ElementType } from "react";

import type { linkTones } from "./style";

export interface LinkOwnProps {
  readonly tone?: (typeof linkTones)[number] | undefined;
  readonly underline?: "always" | "hover" | "none" | undefined;
  readonly className?: string | undefined;
}

export type LinkProps<T extends ElementType = "a"> = Polymorphic<
  T,
  LinkOwnProps
>;
