import type { JSX } from "react";

import { cn } from "../../theme";

import { progressRecipe } from "./style";
import type { ProgressProps } from "./types";

/**
 * `Progress`: a determinate `role="progressbar"`; the indicator's width is `value / max`.
 * Name it with `aria-label` or `aria-labelledby`.
 */
export function Progress({
  value,
  max: maxProp,
  color,
  size,
  className,
  ...rest
}: ProgressProps): JSX.Element {
  const max =
    maxProp !== undefined && Number.isFinite(maxProp) && maxProp > 0
      ? maxProp
      : 100;
  const now = Number.isFinite(value) ? Math.min(Math.max(value, 0), max) : 0;
  return (
    <div
      {...rest}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={now}
      className={
        cn(progressRecipe({ slot: "track", size }), className) || undefined
      }
    >
      <span
        className={progressRecipe({ slot: "indicator", color })}
        style={{ width: `${String((now / max) * 100)}%` }}
      />
    </div>
  );
}
