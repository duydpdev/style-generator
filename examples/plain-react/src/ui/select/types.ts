import type { ComponentPropsWithRef } from "react";

export interface SelectOwnProps {
  /** Control height and text size; replaces the native `size` attribute. */
  readonly size?: "sm" | "md" | "lg" | undefined;
  /** `true` renders `aria-invalid="true"` (and the invalid border). */
  readonly invalid?: boolean | undefined;
  readonly className?: string | undefined;
}

export type SelectProps = SelectOwnProps &
  Omit<ComponentPropsWithRef<"select">, keyof SelectOwnProps>;
