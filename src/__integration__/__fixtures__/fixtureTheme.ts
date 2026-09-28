import { defineTheme } from "../../core/defineTheme";
import type { StyleGeneratorOptions } from "../../core/Options";

/**
 * Shared fixture theme for the DEV.1 → DEV.2 registry-refactor parity test.
 * Exercises every built-in category (colors, typography, shadows,
 * backDropBlurs, borderRadius) plus a `themes` override, so the compiled
 * CSS diff between the pre-registry and registry pipelines is meaningful.
 *
 * IMPORTANT: this theme/options pair must stay import-compatible across the
 * whole DEV.2 commit sequence (before AND after the registry cutover), since
 * it is imported both by the one-off DEV.1 baseline capture script (run
 * against the pre-registry code) and by the permanent
 * `registry-refactor-parity.test.ts` (run against the registry code).
 */
export const fixtureTheme = defineTheme({
  colors: {
    primary: "#3B82F6",
    background: "#FFFFFF",
    sidebarForeground: "#111827",
  },
  typography: {
    text12Mono: {
      fontSize: "12px",
      lineHeight: "150%",
      fontWeight: 400,
      letterSpacing: "0px",
    },
  },
  shadows: {
    sm: "0px 1px 2px rgba(0, 0, 0, 0.05)",
  },
  backDropBlurs: {
    sm: "4px",
  },
  borderRadius: {
    sm: "4px",
  },
  themes: {
    dark: {
      colors: { primary: "#60A5FA", background: "#111827" },
    },
  },
});

export const fixtureOptions: StyleGeneratorOptions = {
  breakpoints: ["md", "lg"],
};

/** Kebab-cased class name Tailwind generates for the `text12Mono` typography key. */
export const FIXTURE_TYPOGRAPHY_CLASS = "text-12-mono";

/**
 * Extra candidates (beyond `generateSafelist`) needed to prove typography
 * utilities pick up `hover:`/`md:` variants once they are emitted via
 * `\@utility` (Task 2 — AC "class do lib tự viết phát bằng \@utility").
 */
export const fixtureExtraCandidates = [
  `hover:${FIXTURE_TYPOGRAPHY_CLASS}`,
  `md:${FIXTURE_TYPOGRAPHY_CLASS}`,
];

/**
 * Handwritten CSS rule referencing `var(--color-primary)`. Tailwind v4's
 * `@theme inline` only declares a mapped var when it is referenced somewhere
 * in the compiled output — `safelistColors` is off by default, so no
 * `bg-primary`/`text-primary` utility would otherwise force the declaration.
 * This rule guarantees `--color-primary` is retained regardless of safelist
 * config, which is exactly what the parity test's exemption (c) verifies.
 */
export const FIXTURE_COLOR_REFERENCE_CSS =
  ".fixture-color-ref { color: var(--color-primary); }";
