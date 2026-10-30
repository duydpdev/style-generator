import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { VERSION } from "../data/version";

import { Menu, Moon, Sun } from "./icon";

export type ActiveRoute = "landing" | "docs" | "examples";

interface Props {
  activeChapter: { num: string; label: string } | null;
  onToggleTheme: () => void;
  activeRoute?: ActiveRoute;
}

const NAV_ID = "topbar-nav";

/**
 * Subscribes to the `data-theme` attribute of <html>, which every page's
 * `useTheme()` writes, so the topbar reflects the theme without owning it.
 * @param {() => void} onChange - Called whenever the attribute changes
 * @returns {() => void} Unsubscribe function
 */
function subscribeTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => {
    observer.disconnect();
  };
}

/**
 * @returns {boolean} Whether the dark theme is currently applied
 */
function isDarkTheme(): boolean {
  return document.documentElement.dataset.theme === "dark";
}

export function Topbar({
  activeChapter,
  onToggleTheme,
  activeRoute = "landing",
}: Readonly<Props>) {
  const showReading = activeChapter !== null;
  const dark = useSyncExternalStore(subscribeTheme, isDarkTheme);
  const { pathname } = useLocation();
  // The dropdown is open only for the route it was opened on, so any route
  // change closes it without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const menuOpen = openAt === pathname;
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenAt(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      const header = headerRef.current;
      if (header && event.target instanceof Node) {
        if (!header.contains(event.target)) setOpenAt(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  const closeMenu = () => {
    setOpenAt(null);
  };

  return (
    <header className="topbar" ref={headerRef}>
      <div className="topbar-inner">
        <div className="topbar-left">
          <Link to="/" className="brand">
            <div className="brand-mark" />
            <div className="brand-meta">
              <b>@duydpdev/style-generator</b>
              <span>v{VERSION} · tailwind v4</span>
            </div>
          </Link>
          <nav
            id={NAV_ID}
            className={`topbar-nav${menuOpen ? " open" : ""}`}
            aria-label="Pages"
          >
            <NavLink
              to="/"
              end
              className={activeRoute === "landing" ? "active" : ""}
              onClick={closeMenu}
            >
              Landing
            </NavLink>
            <NavLink
              to="/docs"
              className={activeRoute === "docs" ? "active" : ""}
              onClick={closeMenu}
            >
              Docs
            </NavLink>
            <NavLink
              to="/examples/v4"
              className={activeRoute === "examples" ? "active" : ""}
              onClick={closeMenu}
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
            aria-pressed={dark}
            title={dark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {dark ? <Moon /> : <Sun />}
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
          <button
            type="button"
            className="btn btn-ghost topbar-menu"
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls={NAV_ID}
            onClick={() => {
              setOpenAt(menuOpen ? null : pathname);
            }}
          >
            <Menu />
          </button>
        </div>
      </div>
    </header>
  );
}
