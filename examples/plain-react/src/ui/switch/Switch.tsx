import { useState, type JSX } from "react";

import { cn } from "../../theme";

import { switchRecipe } from "./style";
import type { SwitchProps } from "./types";

/**
 * `Switch`: `role="switch"` on a `<button>`; `aria-checked` carries the state and drives the
 * track colour and the thumb position. Name it with `aria-label` or a `Field` label. A button
 * submits no value, so the switch takes no `name`/`value`/`form`: put its state in your form data yourself.
 */
export function Switch({
  color,
  size,
  checked,
  defaultChecked = false,
  onCheckedChange,
  onClick,
  className,
  ...rest
}: SwitchProps): JSX.Element {
  const [uncontrolled, setUncontrolled] = useState(defaultChecked);
  const on = checked ?? uncontrolled;
  return (
    <button
      {...rest}
      type="button"
      role="switch"
      aria-checked={on}
      className={
        cn(switchRecipe({ slot: "track", color, size }), className) || undefined
      }
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (checked === undefined) setUncontrolled(!on);
        onCheckedChange?.(!on);
      }}
    >
      <span aria-hidden className={switchRecipe({ slot: "thumb", size })} />
    </button>
  );
}
