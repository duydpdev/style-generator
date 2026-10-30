import { type RefObject, useLayoutEffect } from "react";

/**
 * Scrolls a list container (not the window) so its `.active` item sits in
 * the middle of the visible area; re-runs when `activeKey` changes.
 */
export function useScrollActiveIntoView(
  ref: RefObject<HTMLElement | null>,
  activeKey: string | undefined,
): void {
  useLayoutEffect(() => {
    const list = ref.current;
    const item = list?.querySelector<HTMLElement>(".active");
    if (!list || !item) return;
    list.scrollTop =
      item.offsetTop - (list.clientHeight - item.offsetHeight) / 2;
  }, [ref, activeKey]);
}
