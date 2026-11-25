import type { ReactNode } from "react";

export interface TabItem {
  readonly value: string;
  readonly label: ReactNode;
  readonly panel: ReactNode;
}

export interface TabsOwnProps {
  readonly tabs: readonly TabItem[];
  /** The selected tab, when the app owns the state. */
  readonly value?: string | undefined;
  /** The first selected tab otherwise; the first tab by default. */
  readonly defaultValue?: string | undefined;
  readonly onValueChange?: ((value: string) => void) | undefined;
  /** Names the tab list. */
  readonly "aria-label": string;
  readonly className?: string | undefined;
}

export type TabsProps = TabsOwnProps;
