import type { ComponentPropsWithRef } from "react";

export interface PaginationOwnProps {
  /** The current page, from 1. */
  readonly page: number;
  readonly pageCount: number;
  /** Called with the page a button asks for. */
  readonly onPageChange?: ((page: number) => void) | undefined;
  /** How many pages show on each side of the current one; `1` by default. */
  readonly siblings?: number | undefined;
  readonly size?: "sm" | "md" | "lg" | undefined;
  readonly className?: string | undefined;
}

export type PaginationProps = PaginationOwnProps &
  Omit<ComponentPropsWithRef<"nav">, keyof PaginationOwnProps | "children">;
