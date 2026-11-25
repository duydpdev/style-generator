import type { ReactNode } from "react";

/** The props the field hands to its control: spread them on the input, select or switch. */
export interface FieldControlProps {
  readonly id: string;
  /** The hint and error ids, when they render. */
  readonly "aria-describedby": string | undefined;
  /** `true` while `error` is set. */
  readonly "aria-invalid": true | undefined;
}

export interface FieldProps {
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  /** An error message; it also marks the control invalid. `false`, `null` and `""` mean no error. */
  readonly error?: ReactNode;
  /** Renders the control with the ids that link it to the label, hint and error. */
  readonly children: (control: FieldControlProps) => ReactNode;
  readonly className?: string | undefined;
}
