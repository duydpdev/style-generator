import { VERSION } from "../data/version";

/**
 *
 */
export function CtaFooter() {
  return (
    <>
      <div className="cta-card">
        <div>
          <h3>
            Stop maintaining the plumbing.
            <br />
            Start shipping the design.
          </h3>
          <p>
            One install, one JSON file, one pipeline. Tailwind v4. MIT licensed.
          </p>
        </div>
        <div className="cta-row">
          <a
            className="btn btn-primary btn-lg"
            href="https://github.com/duydpdev/style-generator/pkgs/npm/style-generator"
            target="_blank"
            rel="noopener noreferrer"
          >
            Install from GitHub Packages ↗
          </a>
          <a
            className="btn btn-outline btn-lg"
            href="https://github.com/duydpdev/style-generator"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
        </div>
      </div>

      <div className="footer-inner">
        <div>
          <div className="brand">
            <div className="brand-mark" />
            <div className="brand-meta">
              <b>@duydpdev/style-generator</b>
              <span>v{VERSION} · MIT · 2026</span>
            </div>
          </div>
          <p style={{ marginTop: 12 }}>
            A TypeScript library and CLI for generating Tailwind design systems
            from a single JSON file.
          </p>
        </div>
        <div className="footer-meta">
          <a
            href="https://github.com/duydpdev/style-generator/pkgs/npm/style-generator"
            target="_blank"
            rel="noopener noreferrer"
          >
            package ↗
          </a>
          <a
            href="https://github.com/duydpdev/style-generator"
            target="_blank"
            rel="noopener noreferrer"
          >
            github ↗
          </a>
        </div>
      </div>
    </>
  );
}
