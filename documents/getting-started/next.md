# Getting started: Next.js

This tutorial wires `@duydpdev/style-generator` into a Next.js app (webpack or Turbopack) and styles a page with the utilities your theme generates. Every code block below is copied from [`examples/next-v4`](../../examples/next-v4/README.md), which is built and type-checked in CI.

## Install

Install the package and its peer dependencies as described in [Install](../../README.md#install).

## Share the theme options

The theme is a JSON file ([`examples/design-system/src/theme.json`](../../examples/design-system/src/theme.json), not embedded here). The generator options live in one module that the bundler config, the typed tokens and the recipes all import, so the three never drift apart.

<!-- embed: examples/design-system/src/style-gen.options.ts#options -->

```ts
export const options = {
  breakpoints: ["md", "lg"],
} as const satisfies StyleGeneratorOptions;
```

## Generate theme.css with the Next.js wrapper

`styleGenNext` writes `theme.css` when `next dev` or `next build` loads the config. The example's design system is a workspace package that ships TypeScript source, so `transpilePackages` lets Next compile it; an app that keeps its theme and options in its own directory needs no `transpilePackages`.

<!-- embed: examples/next-v4/next.config.ts#next-config -->

```ts
import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";
import { options } from "design-system-example/style-gen.options";

const nextConfig: NextConfig = {
  // The design system ships TypeScript source (no build step), and the theme
  // switch imports `axisAttributes` from it: let Next compile it.
  transpilePackages: ["design-system-example"],
};

// Next.js runs on Turbopack/webpack (no Vite), so the Vite-only `styleGenVite`
// plugin does not apply. `styleGenNext` does not import `next`, so it works
// under both bundlers. It writes `app/theme/theme.css` when Next loads this
// config in `phase-development-server` (`next dev`, which also watches the
// theme JSON) or `phase-production-build` (`next build`). The theme and the
// generator options are shared with the other examples through the
// `design-system-example` package.
export default styleGenNext({
  themePath: "../design-system/src/theme.json",
  outDir: "app/theme",
  options,
})(nextConfig);
```

## Import the CSS

Import the generated file next to Tailwind. No `@source` line is needed: Tailwind scans `app/`, and `theme.css` lists every token utility in `@source inline(...)`. `palettes.css` holds this example's hand-written dark × palette overrides; your app needs it only if its theme has such combinations.

<!-- embed: examples/next-v4/app/globals.css#css-entry -->

```css
@import "tailwindcss";
@import "./theme/theme.css";
/* Example-only: the dark × palette overrides that themeAxes cannot express. */
@import "design-system-example/styles/palettes.css";
```

## Use the generated utilities

Every class below comes from a `theme.json` token: `bg-primary` and `text-on-primary` from `colors`, `text-12-mono` and `display-56-serif` from `typography`, `rounded-pill` from `borderRadius`, `shadow-md` from `shadows`, `font-serif` from `fontFamily`. The page is a server component.

<!-- embed: examples/next-v4/app/page.tsx#usage -->

```tsx
<header className="flex flex-wrap items-end justify-between gap-4">
  <div>
    <p className="font-mono text-12-mono text-muted">
      @duydpdev/style-generator · Next.js 16
    </p>
    <h1 className="font-serif display-56-serif">Generated utilities</h1>
  </div>
  <ThemeSwitch />
</header>

<section className="flex flex-col gap-4 rounded-lg bg-surface p-6 shadow-md">
  <h2 className="text-20-semibold">Colors</h2>
  <ul className="flex flex-wrap gap-2">
    {SWATCHES.map(({ name, className }) => (
      <li key={name} className={className}>
        {name}
      </li>
    ))}
  </ul>
  <button
    type="button"
    className="self-start rounded-md bg-primary px-4 py-2 text-16-medium text-on-primary hover:bg-primary-hover active:bg-primary-active"
  >
    Primary action
  </button>
</section>
```

## Switch the theme axes

Each `themeAxes` variant is switched on by a `data-*` attribute on `<html>`. The design system's `axisAttributes()` wraps `themeAxisAttributes` from `@duydpdev/style-generator/recipes` and is typed by the theme's axes; a client component applies the attributes after hydration.

<!-- embed: examples/next-v4/app/ThemeSwitch.tsx -->

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { axisAttributes } from "design-system-example";

type AxesState = Parameters<typeof axisAttributes>[0];
type ThemeName = NonNullable<AxesState["theme"]>;
type PaletteName = NonNullable<AxesState["palette"]>;

const THEMES: readonly ThemeName[] = ["base", "dark", "highContrast"];
const PALETTES: readonly PaletteName[] = ["base", "forest", "sunset", "mono"];

const LABEL = "flex flex-col gap-1 font-mono text-12-mono text-muted";
const SELECT =
  "rounded-md border-thin border-muted bg-surface px-2 py-1 font-sans text-14-regular text-foreground";

/**
 * Client component: the `themeAxes` variants switch on through `data-*`
 * attributes on `<html>`, which a server component cannot change after
 * hydration. The attribute map comes from the design system's
 * `axisAttributes`; a variant that is `"base"` produces no attribute, so the
 * names the previous map had and the next one lacks are removed.
 * @returns The two axis pickers and a reset button.
 */
export function ThemeSwitch() {
  const [state, setState] = useState<AxesState>({
    theme: "base",
    palette: "base",
  });

  const applied = useRef<readonly string[]>([]);

  useEffect(() => {
    const root = document.documentElement;
    const attributes = axisAttributes(state);
    for (const name of applied.current) {
      if (!(name in attributes)) root.removeAttribute(name);
    }
    for (const [name, value] of Object.entries(attributes)) {
      root.setAttribute(name, value);
    }
    applied.current = Object.keys(attributes);
  }, [state]);

  return (
    <div className="flex flex-wrap items-end gap-4">
      <label className={LABEL}>
        theme
        <select
          className={SELECT}
          value={state.theme}
          onChange={(event) => {
            setState((prev) => ({
              ...prev,
              theme: event.target.value as ThemeName,
            }));
          }}
        >
          {THEMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL}>
        palette
        <select
          className={SELECT}
          value={state.palette}
          onChange={(event) => {
            setState((prev) => ({
              ...prev,
              palette: event.target.value as PaletteName,
            }));
          }}
        >
          {PALETTES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="rounded-md px-3 py-1 text-14-regular text-primary hover:bg-surface"
        onClick={() => {
          setState({ theme: "base", palette: "base" });
        }}
      >
        Reset
      </button>
    </div>
  );
}
```

## Next steps

- [Components](../components.md): token-typed components over the design-system recipes, for an app that needs a component layer.
- [Theme config](../reference/theme.md): every theme key and its rules.
- [Next.js](../reference/next.md): the wrapper options.
