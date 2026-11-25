import type { ComponentPropsWithRef } from "react";

export interface SkeletonOwnProps {
  /** Classes from the app; set the width and height here or through `style`. */
  readonly className?: string | undefined;
}

export type SkeletonProps = SkeletonOwnProps &
  Omit<ComponentPropsWithRef<"span">, keyof SkeletonOwnProps | "children">;
