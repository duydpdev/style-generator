import type { JSX } from "react";

import { cn } from "../../theme";

import { alertRecipe } from "./style";
import type { AlertProps } from "./types";

/**
 * `Alert`: an inline message with an optional `title`. It is a polite live region
 * (`role="status"`) unless `role` says otherwise; pass `role="alert"` for an error the
 * user must hear at once.
 */
export function Alert({
  color,
  variant,
  title,
  children,
  className,
  role = "status",
  ...rest
}: AlertProps): JSX.Element {
  return (
    <div
      {...rest}
      role={role}
      className={
        cn(alertRecipe({ slot: "root", color, variant }), className) ||
        undefined
      }
    >
      {title !== undefined && (
        <p className={alertRecipe({ slot: "title" })}>{title}</p>
      )}
      {children}
    </div>
  );
}
