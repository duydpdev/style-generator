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
