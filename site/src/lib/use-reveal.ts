import { useEffect } from "react";

/**
 * Marks `[data-reveal]` / `[data-ch]` elements `data-reveal-state="pending"`
 * and flips them to `"done"` on viewport entry. CSS reveals on `"done"`; the
 * phase 03 visual spec waits until no element is `"pending"`.
 */
export function useReveal(): void {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-reveal-state", "done");
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -80px 0px" },
    );
    const nodes = document.querySelectorAll("[data-reveal], [data-ch]");
    nodes.forEach((n) => {
      n.setAttribute("data-reveal-state", "pending");
      io.observe(n);
    });
    return () => {
      io.disconnect();
    };
  }, []);
}
