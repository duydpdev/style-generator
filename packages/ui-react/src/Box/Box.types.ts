import type { ComponentProps } from "react";

/** Props of the `Box` body: every `div` prop plus the style props (typed per app in `shared/uiTypes.ts`). */
export type BoxProps = ComponentProps<"div"> & {
  backgroundColor?: string | undefined;
};
