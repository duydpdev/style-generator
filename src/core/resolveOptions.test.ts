import { describe, it, expect } from "vitest";

import {
  DEFAULT_BREAKPOINTS,
  DEFAULT_SPACING_PROPERTIES,
} from "../shared/defaultOption";

import { defaultScreens } from "./Options";
import { resolveOptions } from "./resolveOptions";

describe("resolveOptions", () => {
  it("applies every default when no options are given", () => {
    const resolved = resolveOptions();
    expect(resolved.breakpoints).toEqual([...DEFAULT_BREAKPOINTS]);
    expect(resolved.screens).toEqual(defaultScreens);
    expect(resolved.enableResponsive).toBe(true);
    expect(resolved.typographyCssVarDriven).toBe(false);
    expect(resolved.spacing).toEqual({
      enabled: true,
      properties: DEFAULT_SPACING_PROPERTIES,
    });
    expect(resolved.extraSources).toEqual([]);
    expect(resolved.coverage).toEqual({});
    expect(resolved.sortedBreakpoints.map((bp) => bp.key)).toEqual([
      "md",
      "lg",
    ]);
  });

  it("does not mutate its input and is deterministic", () => {
    const options = { screens: { md: "800px" }, breakpoints: ["lg", "md"] };
    const snapshot = structuredClone(options);
    expect(resolveOptions(options)).toEqual(resolveOptions(options));
    expect(options).toEqual(snapshot);
  });

  it("sorts breakpoints ascending by resolved width, not by declaration order", () => {
    const resolved = resolveOptions({ breakpoints: ["lg", "md", "xl"] });
    expect(resolved.sortedBreakpoints.map((bp) => bp.key)).toEqual([
      "md",
      "lg",
      "xl",
    ]);
  });

  it("sorts fractional widths numerically, even when the wider one is listed first (48.5rem vs 48rem)", () => {
    const resolved = resolveOptions({
      screens: {
        sm: "40rem",
        md: "48rem",
        lg: "64rem",
        xl: "80rem",
        "2xl": "96rem",
        tablet: "48.5rem",
      },
      breakpoints: ["tablet", "md"],
    });
    expect(resolved.sortedBreakpoints.map((bp) => bp.key)).toEqual([
      "md",
      "tablet",
    ]);
    expect(resolved.sortedBreakpoints.map((bp) => bp.numericValue)).toEqual([
      48, 48.5,
    ]);
  });

  it("drops breakpoints without a screen width and skips sorting when responsive is off", () => {
    expect(
      resolveOptions({ breakpoints: ["md", "ghost"] }).sortedBreakpoints,
    ).toHaveLength(1);
    expect(
      resolveOptions({ enableResponsive: false }).sortedBreakpoints,
    ).toEqual([]);
  });
});
