import type { JSX } from "react";

import { paginationRecipe } from "./style";
import type { PaginationProps } from "./types";

/**
 * The pages to show: the first, the last, and `siblings` on each side of `page`. A gap of one
 * page shows that page; a longer gap becomes an ellipsis.
 */
const pageItems = (
  page: number,
  count: number,
  siblings: number,
): readonly (number | "ellipsis")[] => {
  const shown = new Set([1, count]);
  const end = Math.min(count, page + siblings);
  for (let p = Math.max(1, page - siblings); p <= end; p += 1) shown.add(p);
  const items: (number | "ellipsis")[] = [];
  let previous = 0;
  for (const p of [...shown].sort((a, b) => a - b)) {
    if (p - previous === 2) items.push(previous + 1);
    else if (p - previous > 2) items.push("ellipsis");
    items.push(p);
    previous = p;
  }
  return items;
};

/** A whole number of at least `min`, or `fallback` when `value` is not finite (`NaN`, `Infinity`). */
const whole = (value: number, min: number, fallback: number): number =>
  Number.isFinite(value) ? Math.max(min, Math.floor(value)) : fallback;

/**
 * `Pagination`: a `<nav>` (named "Pagination" unless `aria-label` says otherwise) with
 * Previous, the page buttons and Next. The current page is `aria-current="page"`; the app
 * owns the page state through `onPageChange`.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblings = 1,
  size,
  className,
  "aria-label": label = "Pagination",
  ...rest
}: PaginationProps): JSX.Element {
  const count = whole(pageCount, 1, 1);
  const current = Math.min(whole(page, 1, 1), count);
  const go = (target: number) => () => onPageChange?.(target);
  const pageClass = paginationRecipe({ slot: "page", size });
  return (
    <nav {...rest} aria-label={label} className={className}>
      <ul className={paginationRecipe({ slot: "list" })}>
        <li>
          <button
            type="button"
            className={pageClass}
            disabled={current === 1}
            onClick={go(current - 1)}
          >
            Previous
          </button>
        </li>
        {pageItems(current, count, whole(siblings, 0, count)).map(
          (item, index) =>
            item === "ellipsis" ? (
              // At most two ellipses, told apart by their place in the list.
              <li
                key={`ellipsis-${String(index)}`}
                aria-hidden
                className={paginationRecipe({ slot: "ellipsis", size })}
              >
                …
              </li>
            ) : (
              <li key={item}>
                <button
                  type="button"
                  aria-label={`Page ${String(item)}`}
                  aria-current={item === current ? "page" : undefined}
                  className={
                    item === current
                      ? paginationRecipe({ slot: "current", size })
                      : pageClass
                  }
                  onClick={item === current ? undefined : go(item)}
                >
                  {item}
                </button>
              </li>
            ),
        )}
        <li>
          <button
            type="button"
            className={pageClass}
            disabled={current === count}
            onClick={go(current + 1)}
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}
