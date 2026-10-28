import { Link } from "react-router-dom";

import { ArrowRight } from "../components/icon";

const INSTALL_CMD = "yarn add @duydpdev/style-generator";

const STATS = [
  { k: "Subpaths", v: "8", m: "gzip-budgeted · tree-shakeable", accent: true },
  { k: "Spacing utilities", v: "21", m: "from ~4 800 classes" },
  { k: "Tailwind", v: "v4", m: "the only target" },
  { k: "Runtime", v: "Build-time", m: "CSS generated before ship" },
] as const;

const MARQUEE_TOKENS = [
  "generate",
  "defineTheme",
  "resolveSpacingProps",
  "createVariantMapper",
  "styleGenVite",
  "generateThemeCss",
  "ColorVariant<Theme>",
  "style-gen init",
  "style-gen doctor",
];

/**
 *
 */
export function HeroSection() {
  return (
    <section
      id="hero"
      className="hero chapter"
      data-ch="00"
      data-ch-label="Cover"
    >
      <div className="ch-marker">00</div>
      <div className="reveal-stagger">
        <div className="hero-eyebrow">
          <span className="dot" />
          Typed · Tailwind v4 · MIT
        </div>
        <h1 className="hero-title">
          A design system from <em>one</em> JSON.
        </h1>
        <p className="hero-lede">
          <b>@duydpdev/style-generator</b> compiles a flat{" "}
          <code>theme.json</code> into complete Tailwind v4 CSS — variables,
          dark mode overrides, registry-generated <code>@source inline</code>{" "}
          utility coverage, runtime spacing utilities, typed design tokens. One
          source of truth. No safelist file to maintain.
        </p>
        <div className="hero-cta">
          <Link className="install" to="/docs/reference#1-installation">
            <span className="prompt">$</span>
            <span>{INSTALL_CMD}</span>
            <span className="install-go">Install guide →</span>
          </Link>
          <a className="btn btn-primary btn-lg" href="#start">
            Get started <ArrowRight />
          </a>
        </div>
      </div>

      <div className="hero-stats reveal-stagger">
        {STATS.map((s) => (
          <div key={s.k} className="stat">
            <span className="k">{s.k}</span>
            <span className={`v${"accent" in s ? " accent" : ""}`}>{s.v}</span>
            <span className="m">{s.m}</span>
          </div>
        ))}
      </div>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...MARQUEE_TOKENS, ...MARQUEE_TOKENS].map((t, i) => (
            <span key={`${t}-${String(i)}`}>{t}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
