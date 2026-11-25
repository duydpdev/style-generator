import type { JSX } from "react";

import { cn } from "../../theme";

import { skeletonRecipe } from "./style";
import type { SkeletonProps } from "./types";

/**
 * `Skeleton`: a placeholder block shown while content loads. It is hidden from
 * assistive technology; announce the loading state on the region it fills (`aria-busy`).
 */
export function Skeleton({ className, ...rest }: SkeletonProps): JSX.Element {
  return (
    <span
      aria-hidden
      {...rest}
      className={cn(skeletonRecipe(), className) || undefined}
    />
  );
}
