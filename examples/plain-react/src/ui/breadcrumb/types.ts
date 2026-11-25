import type { ComponentPropsWithRef, ReactNode } from "react";

export interface BreadcrumbItem {
  readonly label: ReactNode;
  /** The link; the last item is the current page and renders without one. */
  readonly href?: string | undefined;
}

export interface BreadcrumbOwnProps {
  /** The trail from the root to the current page, which is the last item. */
  readonly items: readonly BreadcrumbItem[];
  /** What separates two items; `"/"` by default. Hidden from assistive technology. */
  readonly separator?: ReactNode;
  readonly className?: string | undefined;
}

export type BreadcrumbProps = BreadcrumbOwnProps &
  Omit<ComponentPropsWithRef<"nav">, keyof BreadcrumbOwnProps | "children">;
