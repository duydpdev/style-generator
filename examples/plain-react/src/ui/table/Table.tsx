import type { JSX } from "react";

import { cn } from "../../theme";

import { tableRecipe } from "./style";
import type { TableProps } from "./types";

/** `Table`: a native `<table>` with a header row of `scope="col"` cells, one row per item and an optional `<caption>`. */
export function Table({
  columns,
  rows,
  rowKey = (_row, index) => index,
  caption,
  className,
  ...rest
}: TableProps): JSX.Element {
  return (
    <table
      {...rest}
      className={cn(tableRecipe({ slot: "root" }), className) || undefined}
    >
      {caption !== undefined && (
        <caption className={tableRecipe({ slot: "caption" })}>
          {caption}
        </caption>
      )}
      <thead>
        <tr className={tableRecipe({ slot: "row" })}>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={tableRecipe({ slot: "header", align: column.align })}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={rowKey(row, index)} className={tableRecipe({ slot: "row" })}>
            {columns.map((column) => (
              <td
                key={column.key}
                className={tableRecipe({ slot: "cell", align: column.align })}
              >
                {row[column.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
