import type { JSX } from "react";

import { breadcrumbRecipe } from "./style";
import type { BreadcrumbProps } from "./types";

/**
 * `Breadcrumb`: a `<nav>` (named "Breadcrumb" unless `aria-label` says otherwise) around an
 * ordered list; the last item is the current page (`aria-current="page"`).
 */
export function Breadcrumb({
  items,
  separator = "/",
  className,
  "aria-label": label = "Breadcrumb",
  ...rest
}: BreadcrumbProps): JSX.Element {
  return (
    <nav {...rest} aria-label={label} className={className}>
      <ol className={breadcrumbRecipe({ slot: "list" })}>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            // The trail is positional: an item's place is its identity.
            <li key={index} className={breadcrumbRecipe({ slot: "item" })}>
              {last || item.href === undefined ? (
                <span
                  aria-current={last ? "page" : undefined}
                  className={breadcrumbRecipe({
                    slot: last ? "current" : "item",
                  })}
                >
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  className={breadcrumbRecipe({ slot: "link" })}
                >
                  {item.label}
                </a>
              )}
              {!last && (
                <span
                  aria-hidden
                  className={breadcrumbRecipe({ slot: "separator" })}
                >
                  {separator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
