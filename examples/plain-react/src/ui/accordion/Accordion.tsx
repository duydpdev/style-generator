import { useId, type JSX } from "react";

import { cn } from "../../theme";

import { accordionRecipe } from "./style";
import type { AccordionProps } from "./types";

/**
 * `Accordion`: native `<details>`/`<summary>` sections, so opening, closing and the keyboard
 * need no script. `exclusive` gives them one `name`; a browser without exclusive `<details>`
 * lets several stay open.
 */
export function Accordion({
  items,
  exclusive = false,
  className,
}: AccordionProps): JSX.Element {
  const name = useId();
  return (
    <div
      className={cn(accordionRecipe({ slot: "root" }), className) || undefined}
    >
      {items.map((item) => (
        <details
          key={item.id}
          name={exclusive ? name : undefined}
          open={item.defaultOpen}
          className={accordionRecipe({ slot: "item" })}
        >
          <summary className={accordionRecipe({ slot: "trigger" })}>
            {item.title}
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={accordionRecipe({ slot: "icon" })}
            >
              <path d="m4 6 4 4 4-4" />
            </svg>
          </summary>
          <div className={accordionRecipe({ slot: "content" })}>
            {item.content}
          </div>
        </details>
      ))}
    </div>
  );
}
