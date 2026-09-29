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
    tw: <>Hand-rolled safelist regex.</>,
    us: (
      <>
        <b>
          <code>@source inline(...)</code>
        </b>{" "}
        — auto-generated.
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
        <code>themes.dark</code> in JSON → overrides generated.
      </>
    ),
  },
  {
    label: "Responsive spacing",
    tw: (
      <>
        <span className="pill pill-warn">~4 800 classes</span>All axis × size ×
        bp shipped.
      </>
    ),
    us: (
      <>
        <span className="pill pill-good">0 classes</span>
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
    label: "Tailwind v3 ↔ v4",
    tw: <>Two parallel codebases.</>,
    us: (
      <>
        <span className="pill pill-info">auto-detect</span>Same JSON. Plugin
        morphs.
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
    tw: <>Wire plugin from node_modules manually.</>,
    us: <>~3.7 kB · subpath imports · side-effect free.</>,
  },
  {
    label: "Scaffolding",
    tw: <>Copy-paste from docs.</>,
    us: (
      <>
        <code>npx style-gen init</code> — interactive wizard.
      </>
    ),
  },
];
