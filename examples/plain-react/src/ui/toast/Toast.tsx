import type { JSX } from "react";

import { cn } from "../../theme";

import { toastRecipe } from "./style";
import type { ToastProps } from "./types";

/**
 * `Toast`: one notification panel, a polite live region (`role="status"`). It fades and
 * slides in when it mounts; the queue, the position and the timeout belong to the app.
 * A live region inserted together with its text is not announced reliably: render toasts
 * inside a container that stays on the page.
 */
export function Toast({
  title,
  children,
  className,
  role = "status",
  ...rest
}: ToastProps): JSX.Element {
  return (
    <div
      {...rest}
      role={role}
      className={cn(toastRecipe({ slot: "root" }), className) || undefined}
    >
      <p className={toastRecipe({ slot: "title" })}>{title}</p>
      {children !== undefined && (
        <p className={toastRecipe({ slot: "description" })}>{children}</p>
      )}
    </div>
  );
}
