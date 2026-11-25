import { useId, useRef, useState, type JSX, type KeyboardEvent } from "react";

import { tabsRecipe } from "./style";
import type { TabsProps } from "./types";

/**
 * `Tabs`: a `role="tablist"` of `role="tab"` buttons and their `role="tabpanel"`s. Only the
 * selected tab is in the tab order; ArrowLeft/ArrowRight (wrapping), Home and End move the
 * focus and select the tab they land on.
 */
export function Tabs({
  tabs,
  value,
  defaultValue,
  onValueChange,
  "aria-label": label,
  className,
}: TabsProps): JSX.Element {
  const id = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [uncontrolled, setUncontrolled] = useState(
    defaultValue ?? tabs[0]?.value,
  );
  const wanted = value ?? uncontrolled;
  // A value that names no tab (async tabs, a removed tab, a typo) falls back to the first tab,
  // so exactly one tab stays in the tab order.
  const selected = tabs.some((tab) => tab.value === wanted)
    ? wanted
    : tabs[0]?.value;
  const select = (index: number) => {
    const tab = tabs[index];
    if (tab === undefined) return;
    if (value === undefined) setUncontrolled(tab.value);
    onValueChange?.(tab.value);
    refs.current[index]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const target = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    select(target);
  };
  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className={tabsRecipe({ slot: "list" })}
      >
        {tabs.map((tab, index) => {
          const on = tab.value === selected;
          return (
            <button
              key={tab.value}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${String(index)}`}
              aria-selected={on}
              aria-controls={`${id}-panel-${String(index)}`}
              tabIndex={on ? 0 : -1}
              className={tabsRecipe({ slot: "tab" })}
              onClick={() => {
                select(index);
              }}
              onKeyDown={(event) => {
                onKeyDown(event, index);
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.value}
          role="tabpanel"
          id={`${id}-panel-${String(index)}`}
          aria-labelledby={`${id}-tab-${String(index)}`}
          tabIndex={0}
          hidden={tab.value !== selected}
          className={tabsRecipe({ slot: "panel" })}
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
