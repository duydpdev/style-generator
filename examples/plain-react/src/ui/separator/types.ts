import type { ComponentPropsWithRef } from "react";

export interface SeparatorOwnProps {
  readonly orientation?: "horizontal" | "vertical" | undefined;
  /** A purely visual rule: `role="none"`, so assistive technology skips it. */
  readonly decorative?: boolean | undefined;
  readonly className?: string | undefined;
}

export type SeparatorProps = SeparatorOwnProps &
  Omit<
    ComponentPropsWithRef<"div">,
    keyof SeparatorOwnProps | "role" | "aria-orientation" | "children"
  >;
