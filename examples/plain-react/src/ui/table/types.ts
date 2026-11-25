import type { ComponentPropsWithRef, Key, ReactNode } from "react";

export interface TableColumn {
  /** The row field this column shows. */
  readonly key: string;
  readonly header: ReactNode;
  /** `end` for numbers; `start` by default. */
  readonly align?: "start" | "end" | undefined;
}

export interface TableOwnProps {
  readonly columns: readonly TableColumn[];
  readonly rows: readonly Readonly<Record<string, ReactNode>>[];
  /** A stable key per row; the row's index by default. */
  readonly rowKey?:
    | ((row: Readonly<Record<string, ReactNode>>, index: number) => Key)
    | undefined;
  /** Names the table; rendered under it. Without it, name the table with `aria-label`. */
  readonly caption?: ReactNode;
  readonly className?: string | undefined;
}

export type TableProps = TableOwnProps &
  Omit<ComponentPropsWithRef<"table">, keyof TableOwnProps | "children">;
