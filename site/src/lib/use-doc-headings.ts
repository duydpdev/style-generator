import { useEffect, useState } from "react";
import type { RefObject } from "react";

export interface DocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

/** The in-content TOC heading is not worth a navigation entry. */
const TOC_TITLE = "table of contents";

/** The `h2`/`h3` headings of the rendered doc; re-scanned when the markdown changes. */
export function useDocHeadings(
  contentRef: RefObject<HTMLElement | null>,
  rawMarkdown: string,
): DocHeading[] {
  const [headings, setHeadings] = useState<DocHeading[]>([]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      const found = Array.from(el.querySelectorAll("h2[id], h3[id]"));
      const list: DocHeading[] = found
        .filter((h) => h.textContent.trim().toLowerCase() !== TOC_TITLE)
        .map((h) => ({
          id: h.id,
          text: h.textContent.replace(/`/g, ""),
          level: h.tagName === "H3" ? 3 : 2,
        }));
      setHeadings(list);
    });
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [contentRef, rawMarkdown]);

  return headings;
}

/** Smooth-scrolls to a heading, leaving room for the sticky top bar. */
export function jumpToHeading(id: string) {
  const node = document.getElementById(id);
  if (!node) return;
  const top = node.getBoundingClientRect().top + window.scrollY - 80;
  window.scrollTo({ top, behavior: "smooth" });
}

/** Scroll spy: the heading under the trigger line and how much of the doc was read. */
export function useDocScroll(
  contentRef: RefObject<HTMLElement | null>,
  headings: DocHeading[],
) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const winH = window.innerHeight;
        const rect = el.getBoundingClientRect();
        const total = Math.max(1, el.offsetHeight - winH * 0.6);
        const read = Math.min(1, Math.max(0, -rect.top / total));
        setProgress(read);

        const trigger = 110;
        let active: string | null = null;
        for (const h of headings) {
          const node = document.getElementById(h.id);
          if (!node) continue;
          if (node.getBoundingClientRect().top <= trigger) active = h.id;
        }
        setActiveId(active);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [contentRef, headings]);

  return { activeId, progress };
}
