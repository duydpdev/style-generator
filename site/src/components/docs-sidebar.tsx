import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { VERSION } from "../data/version";
import { docs, groupedDocs } from "../lib/docs-content";

interface Props {
  activeSlug?: string;
}

export function DocsSidebar({ activeSlug }: Readonly<Props>) {
  const groups = groupedDocs();
  let counter = 0;

  return (
    <aside className="docs-rail">
      <div className="docs-rail-sticky">
        <div>
          <div className="rail-label">Documentation</div>
          {groups.map((g) => (
            <div key={g.group} className="docnav-group">
              <div className="docnav-heading">{g.group}</div>
              {g.docs.map((d) => {
                counter += 1;
                const num = String(counter).padStart(2, "0");
                return (
                  <NavLink
                    key={d.slug}
                    to={`/docs/${d.slug}`}
                    className={`docnav-item${d.slug === activeSlug ? " active" : ""}`}
                  >
                    <span className="num">{num}</span>
                    <span>{d.title}</span>
                    {d.badge ? (
                      <span className="doc-badge">{d.badge}</span>
                    ) : null}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        <div className="rail-foot">
          <div className="row">
            <span>VERSION</span>
            <span>v{VERSION}</span>
          </div>
          <div className="row">
            <span>LICENSE</span>
            <span>MIT</span>
          </div>
          <div className="row">
            <span>SOURCE</span>
            <a
              href="https://github.com/duydpdev/style-generator"
              target="_blank"
              rel="noopener noreferrer"
            >
              github ↗
            </a>
          </div>
          <div className="row">
            <span>DOCS</span>
            <span>{docs.length} pages</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

interface MobileNavProps {
  activeSlug?: string;
  /** Extra disclosure blocks rendered after the page list. */
  children?: ReactNode;
}

/**
 * Docs switcher for <=860px, where the left rail is hidden: a disclosure with
 * the same grouped page list as `DocsSidebar`.
 */
export function DocsMobileNav({
  activeSlug,
  children,
}: Readonly<MobileNavProps>) {
  const groups = groupedDocs();
  const current = docs.find((d) => d.slug === activeSlug);
  let counter = 0;

  return (
    <nav className="docs-mobile-nav" aria-label="Docs">
      <details className="docs-mobile-details">
        <summary>
          <span className="lbl">Docs</span>
          <span className="cur">{current?.title ?? "All pages"}</span>
        </summary>
        <div className="docs-mobile-pages">
          {groups.map((g) => (
            <div key={g.group} className="docnav-group">
              <div className="docnav-heading">{g.group}</div>
              {g.docs.map((d) => {
                counter += 1;
                const num = String(counter).padStart(2, "0");
                const isCurrent = d.slug === activeSlug;
                return (
                  <NavLink
                    key={d.slug}
                    to={`/docs/${d.slug}`}
                    className={`docnav-item${isCurrent ? " active" : ""}`}
                    onClick={(e) => {
                      e.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                    }}
                  >
                    <span className="num">{num}</span>
                    <span>{d.title}</span>
                    {d.badge ? (
                      <span className="doc-badge">{d.badge}</span>
                    ) : null}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      </details>
      {children}
    </nav>
  );
}
