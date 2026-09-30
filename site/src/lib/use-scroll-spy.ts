import { useEffect, useState } from "react";

import type { Chapter } from "./chapters";

interface ScrollSpy {
  activeIndex: number;
  progress: number;
}

/**
 *
 * @param chapters
 */
export function useScrollSpy(chapters: Chapter[]): ScrollSpy {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        const pct =
          docH > 0 ? Math.min(1, Math.max(0, window.scrollY / docH)) : 0;
        setProgress(pct);

        const trigger = window.innerHeight * 0.3;
        let next = 0;
        for (let i = 0; i < chapters.length; i++) {
          const el = document.getElementById(chapters[i].id);
          if (!el) continue;
          const top = el.getBoundingClientRect().top;
          if (top <= trigger) next = i;
        }
        setActiveIndex(next);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [chapters]);

  return { activeIndex, progress };
}

/**
 *
 * @param id
 * @param offset
 */
export function scrollToChapter(id: string, offset = 72): void {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
}
