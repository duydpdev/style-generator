import type { ReactNode } from "react";

export interface AccordionItem {
  readonly id: string;
  readonly title: ReactNode;
  readonly content: ReactNode;
  readonly defaultOpen?: boolean | undefined;
}

export interface AccordionOwnProps {
  readonly items: readonly AccordionItem[];
  /** One section open at a time: the `<details>` share a `name`, so the browser closes the others. */
  readonly exclusive?: boolean | undefined;
  readonly className?: string | undefined;
}

export type AccordionProps = AccordionOwnProps;
