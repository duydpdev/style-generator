import type { ComponentPropsWithRef } from "react";

export interface TextareaOwnProps {
  /** Padding and text size. */
  readonly size?: "sm" | "md" | "lg" | undefined;
  /** `true` renders `aria-invalid="true"` (and the invalid border). */
  readonly invalid?: boolean | undefined;
  readonly className?: string | undefined;
}

export type TextareaProps = TextareaOwnProps &
  Omit<ComponentPropsWithRef<"textarea">, keyof TextareaOwnProps>;
