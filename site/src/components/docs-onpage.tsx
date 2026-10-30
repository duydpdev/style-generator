import { useEffect, useState } from "react";
import type { RefObject } from "react";

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

interface Props {
  contentRef: RefObject<HTMLElement | null>;
  rawMarkdown: string;
  quicklinks?: { label: string; href: string; arr?: string }[];
}

/** The in-content TOC heading is not worth a navigation entry. */
const TOC_TITLE = "table of contents";

function useHeadings(
  contentRef: RefObject<HTMLElement | null>,
  rawMarkdown: string,
): Heading[] {
  const [headings, setHeadings] = useState<Heading[]>([]);

  // Re-scan headings whenever the markdown changes
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      const found = Array.from(el.querySelectorAll("h2[id], h3[id]"));
      const list: Heading[] = found
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

function jump(id: string) {
  const node = document.getElementById(id);
  if (!node) return;
  const top = node.getBoundingClientRect().top + window.scrollY - 80;
  window.scrollTo({ top, behavior: "smooth" });
}

export function DocsOnPage({
  contentRef,
  rawMarkdown,
  quicklinks = [],
}: Readonly<Props>) {
  const headings = useHeadings(contentRef, rawMarkdown);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Scroll spy + progress fill
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

  return (
    <aside className="toc-rail">
      <div className="toc-rail-sticky">
        <div className="toc-rail-label">On this page</div>
        <ol className="onpage">
          {headings.map((h) => (
            <li
              key={h.id}
              className={`h${String(h.level)}${h.id === activeId ? " active" : ""}`}
            >
              <button
                type="button"
                aria-current={h.id === activeId ? "location" : undefined}
                onClick={() => {
                  jump(h.id);
                }}
              >
                {h.text}
              </button>
            </li>
          ))}
        </ol>

        <div className="toc-rail-progress">
          <span>READ</span>
          <span className="toc-progress-track">
            <span
              className="toc-progress-fill"
              style={{ transform: `scaleX(${String(progress)})` }}
            />
          </span>
          <span>{Math.round(progress * 100)}%</span>
        </div>

        {quicklinks.length > 0 ? (
          <div className="toc-quicklinks">
            {quicklinks.map((q) => (
              <a
                key={q.href}
                href={q.href}
                target={q.href.startsWith("http") ? "_blank" : undefined}
                rel={
                  q.href.startsWith("http") ? "noopener noreferrer" : undefined
                }
              >
                <span>{q.label}</span>
                <span className="arr">{q.arr ?? "↗"}</span>
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

type MobileProps = Pick<Props, "contentRef" | "rawMarkdown">;

/** "On this page" list for <=860px, where the right rail is hidden. */
export function DocsMobileOnPage({
  contentRef,
  rawMarkdown,
}: Readonly<MobileProps>) {
  const headings = useHeadings(contentRef, rawMarkdown);
  if (headings.length === 0) return null;

  return (
    <details className="docs-mobile-details">
      <summary>
        <span className="lbl">On this page</span>
        <span className="cur">{headings.length} sections</span>
      </summary>
      <ol className="docs-mobile-onpage">
        {headings.map((h) => (
          <li key={h.id} className={`h${String(h.level)}`}>
            <button
              type="button"
              onClick={(e) => {
                // Close first: the list sits above the content and shifts it.
                e.currentTarget.closest("details")?.removeAttribute("open");
                jump(h.id);
              }}
            >
              {h.text}
            </button>
          </li>
        ))}
      </ol>
    </details>
  );
}
