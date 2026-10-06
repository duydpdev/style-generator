import { Link, NavLink } from "react-router-dom";

import { VERSION } from "../data/version";

import { Sun } from "./icon";

export type ActiveRoute = "landing" | "docs" | "examples";

interface Props {
  activeChapter: { num: string; label: string } | null;
  onToggleTheme: () => void;
  activeRoute?: ActiveRoute;
}

export function Topbar({
  activeChapter,
  onToggleTheme,
  activeRoute = "landing",
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
