import type { ReactNode } from "react";

export interface CompareRow {
  label: string;
  tw: ReactNode;
  us: ReactNode;
}

export const COMPARE_ROWS: CompareRow[] = [
  {
    label: "Source of truth",
    tw: (
      <>
        <span className="pill pill-warn">scattered</span>Split across config,
        CSS, props.
      </>
    ),
    us: (
      <>
        <span className="pill pill-good">single file</span>One <b>theme.json</b>{" "}
        drives everything.
      </>
    ),
  },
  {
    label: "Dynamic colors",
    tw: (
      <>
        Hand-written <code>@source inline()</code> lists, kept in sync by hand.
      </>
    ),
    us: (
      <>
        <b>
          <code>@source inline(...)</code>
        </b>{" "}
        — generated per token category and state.
      </>
    ),
  },
  {
    label: "Dark / multi-theme",
    tw: (
      <>
        Manual <code>:root</code> overrides.
      </>
    ),
    us: (
      <>
        <code>themeAxes.theme.dark</code> in JSON → overrides generated.
      </>
    ),
  },
  {
    label: "Responsive spacing",
    tw: (
      <>
        <span className="pill pill-warn">~4 800 classes</span>Every axis × size
        × bp safelisted.
      </>
    ),
    us: (
      <>
        <span className="pill pill-good">21 utilities</span>
        <code>.sp-p</code> + CSS custom-property chains.
      </>
    ),
  },
  {
    label: "Typed tokens",
    tw: <>None. Drift between CSS and props.</>,
    us: (
      <>
        <code>ColorVariant&lt;Theme&gt;</code> — autocomplete + type-check.
      </>
    ),
  },
  {
    label: "CVA mapping",
    tw: (
      <>
        Hand-write <code>{`{ primary: "bg-primary" }`}</code>.
      </>
    ),
    us: (
      <>
        <code>createVariantMapper("bg", tokens)</code> — kebab auto.
      </>
    ),
  },
  {
    label: "Theme validation",
    tw: <>None. A typo in a token name fails silently in CSS.</>,
    us: (
      <>
        <span className="pill pill-info">build-time</span>Unknown keys and
        unsafe values rejected by the schema.
      </>
    ),
  },
  {
    label: "Vite integration",
    tw: (
      <>
        Custom <code>predev</code> / <code>prebuild</code> scripts.
      </>
    ),
    us: (
      <>
        <code>styleGenVite()</code> — HMR on JSON save.
      </>
    ),
  },
  {
    label: "Bundle impact",
    tw: <>Glue code for each feature lives in your app.</>,
    us: <>8 subpath imports · gzip-budgeted · side-effect free.</>,
  },
  {
    label: "Scaffolding",
    tw: <>Copy-paste from docs.</>,
    us: (
      <>
        <code>yarn style-gen init</code> — interactive wizard.
      </>
    ),
  },
];
