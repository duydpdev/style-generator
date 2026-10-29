import { useEffect } from "react";

/**
 * Adds `is-in` to `.reveal` / `.reveal-stagger` elements on viewport entry,
 * plus `in-view` for `.chapter` markers. Mirrors prototype IntersectionObserver.
 * Test hook: every observed node carries `data-reveal-state` ("pending", then "done"); only e2e-site/site.spec.ts reads it, never CSS.
 */
export function useReveal(): void {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            if (e.target.classList.contains("chapter")) {
              e.target.classList.add("in-view");
            }
            e.target.setAttribute("data-reveal-state", "done");
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -80px 0px" },
    );
    const nodes = document.querySelectorAll(
      ".reveal, .reveal-stagger, .chapter",
    );
    nodes.forEach((n) => {
      n.setAttribute("data-reveal-state", "pending");
      io.observe(n);
    });
    return () => {
      io.disconnect();
    };
  }, []);
}
