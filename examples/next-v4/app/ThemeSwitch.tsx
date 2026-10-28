"use client";

import { useEffect, useState } from "react";
import {
  axisAttributes,
  buttonRecipe,
  cn,
  stackRecipe,
  textRecipe,
} from "design-system-example";

type AxesState = Parameters<typeof axisAttributes>[0];
type ThemeName = NonNullable<AxesState["theme"]>;
type PaletteName = NonNullable<AxesState["palette"]>;

const THEMES: readonly ThemeName[] = ["base", "dark", "highContrast"];
const PALETTES: readonly PaletteName[] = ["base", "forest", "sunset", "mono"];

const AXIS_ATTRIBUTES = ["data-theme", "data-palette"] as const;

/**
 * Next-specific piece: a client component, because the axis attributes live on
 * `<html>`, which a server component cannot reach after hydration. The
 * attribute map comes from the design system's `axisAttributes`; a variant that
 * is `"base"` produces no attribute, so stale ones are removed first.
 * @returns The two axis pickers.
 */
export function ThemeSwitch() {
  const [state, setState] = useState<AxesState>({
    theme: "base",
    palette: "base",
  });

  useEffect(() => {
    const root = document.documentElement;
    for (const name of AXIS_ATTRIBUTES) root.removeAttribute(name);
    for (const [name, value] of Object.entries(axisAttributes(state))) {
      root.setAttribute(name, value);
    }
  }, [state]);

  return (
    <div className={cn(stackRecipe({ direction: "row", wrap: true }), "gap-4")}>
      <label className={cn(stackRecipe({ align: "start" }), "gap-1")}>
        <span className={textRecipe({ type: "text12Mono", color: "muted" })}>
          theme
        </span>
        <select
          className="rounded-md border border-current/20 bg-surface px-2 py-1"
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
      <label className={cn(stackRecipe({ align: "start" }), "gap-1")}>
        <span className={textRecipe({ type: "text12Mono", color: "muted" })}>
          palette
        </span>
        <select
          className="rounded-md border border-current/20 bg-surface px-2 py-1"
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
        className={buttonRecipe({ variant: "ghost", size: "sm" })}
        onClick={() => {
          setState({ theme: "base", palette: "base" });
        }}
      >
        Reset
      </button>
    </div>
  );
}
