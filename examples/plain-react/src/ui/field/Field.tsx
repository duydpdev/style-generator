import { useId, type JSX, type ReactNode } from "react";

import { cn } from "../../theme";

import { fieldRecipe } from "./style";
import type { FieldProps } from "./types";

/**
 * Whether a hint or error renders: `false`, `null` and `""` render nothing, so
 * `error={touched && message}` leaves the control valid until it is touched.
 */
const shown = (node: ReactNode): boolean =>
  node !== undefined && node !== null && node !== false && node !== "";

/**
 * `Field`: a label, a control, an optional hint and an optional error. The control comes
 * from `children(control)`, which receives the id the label points at and the ids of the
 * hint and the error; an error also sets `aria-invalid`, so the message is never colour only.
 */
export function Field({
  label,
  hint,
  error,
  children,
  className,
}: FieldProps): JSX.Element {
  const id = useId();
  const hintId = !shown(hint) ? undefined : `${id}-hint`;
  const errorId = !shown(error) ? undefined : `${id}-error`;
  const describedBy =
    [hintId, errorId].filter((part) => part !== undefined).join(" ") ||
    undefined;
  return (
    <div className={cn(fieldRecipe({ slot: "root" }), className) || undefined}>
      <label htmlFor={id} className={fieldRecipe({ slot: "label" })}>
        {label}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": errorId === undefined ? undefined : true,
      })}
      {hintId !== undefined && (
        <p id={hintId} className={fieldRecipe({ slot: "hint" })}>
          {hint}
        </p>
      )}
      {errorId !== undefined && (
        <p id={errorId} className={fieldRecipe({ slot: "error" })}>
          {error}
        </p>
      )}
    </div>
  );
}
