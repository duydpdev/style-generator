import { Link, NavLink } from "react-router-dom";

import { VERSION } from "../data/version";

import { Sun } from "./icon";

export type ActiveRoute = "landing" | "docs" | "examples";

interface Props {
  activeChapter: { num: string; label: string } | null;
  onToggleTheme: () => void;
  activeRoute?: ActiveRoute;
  showSearchPill?: boolean;
}

export function Topbar({
  activeChapter,
  onToggleTheme,
  activeRoute = "landing",
  showSearchPill = false,
}: Readonly<Props>) {
  const showReading = activeChapter !== null;

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div style={{ display: "flex", alignItems: "center" }}>
          <Link to="/" className="brand">
            <div className="brand-mark" />
            <div className="brand-meta">
              <b>@duydpdev/style-generator</b>
              <span>v{VERSION} · tailwind v4</span>
            </div>
          </Link>
          <nav className="topbar-nav">
            <NavLink
              to="/"
              end
              className={activeRoute === "landing" ? "active" : ""}
            >
              Landing
            </NavLink>
            <NavLink
              to="/docs"
              className={activeRoute === "docs" ? "active" : ""}
            >
              Docs
            </NavLink>
            <NavLink
              to="/examples/v4"
              className={activeRoute === "examples" ? "active" : ""}
            >
              Examples
            </NavLink>
          </nav>
        </div>

        <div className={`now-reading${showReading ? " visible" : ""}`}>
          <span className="pulse" />
          Reading{" "}
          <span className="now-ch">
            {activeChapter
              ? `Ch. ${activeChapter.num} — ${activeChapter.label}`
              : "— Cover"}
          </span>
        </div>

        <div className="topbar-actions">
          {showSearchPill ? (
            <div
              className="search-pill"
              role="button"
              tabIndex={0}
              aria-label="Search docs (placeholder)"
            >
              <svg className="ic" viewBox="0 0 16 16">
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5l3 3" />
              </svg>
              <span>Search docs…</span>
              <span className="kbd-hint">⌘K</span>
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
          >
            <Sun />
          </button>
          <a
            className="btn btn-outline"
            href="https://github.com/duydpdev/style-generator"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
          <a
            className="btn btn-primary"
            href="https://github.com/duydpdev/style-generator/pkgs/npm/style-generator"
            target="_blank"
            rel="noopener noreferrer"
          >
            package ↗
          </a>
        </div>
      </div>
    </header>
  );
}
