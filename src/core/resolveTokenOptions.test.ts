import { describe, it, expect } from "vitest";

import {
  DEFAULT_BREAKPOINTS,
  DEFAULT_SPACING_PROPERTIES,
} from "../shared/defaultOption";

import { defaultScreens } from "./Options";
import { mergeScreens, resolveTokenOptions } from "./resolveTokenOptions";

describe("resolveTokenOptions", () => {
  it("applies every default when no options are given", () => {
    expect(resolveTokenOptions()).toEqual({
      breakpoints: [...DEFAULT_BREAKPOINTS],
      screens: defaultScreens,
      spacing: { enabled: true, properties: DEFAULT_SPACING_PROPERTIES },
    });
  });

  it("keeps the given breakpoints in their order and merges custom screens", () => {
    const resolved = resolveTokenOptions({
      breakpoints: ["lg", "md"],
      screens: { md: "800px" },
      spacing: { enabled: false },
    });
    expect(resolved.breakpoints).toEqual(["lg", "md"]);
    expect(resolved.screens).toEqual({ ...defaultScreens, md: "800px" });
    expect(resolved.spacing.enabled).toBe(false);
  });
});

describe("mergeScreens", () => {
  it("lets custom screens override and extend the defaults", () => {
    expect(mergeScreens({ md: "800px", "3xl": "1920px" })).toEqual({
      ...defaultScreens,
      md: "800px",
      "3xl": "1920px",
    });
    expect(mergeScreens(undefined)).toEqual(defaultScreens);
  });
});
