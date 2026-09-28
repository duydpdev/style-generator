import { describe, it, expect } from "vitest";

import { resolveSpacingProps } from "./spacingHelpers";

describe("resolveSpacingProps", () => {
  it("joins classNames with a single space, in insertion order", () => {
    const { classNames } = resolveSpacingProps({ p: 4, m: 2 });
    expect(classNames).toBe("sp-p sp-m");
  });

  it("merges the CSS variable style map across every resolved prop", () => {
    const { style } = resolveSpacingProps({
      p: 4,
      mx: { base: 2, md: 4 },
    });
    expect(style).toEqual({
      "--sg-sp-p": "1rem",
      "--sg-sp-mx": "0.5rem",
      "--sg-sp-mx-md": "1rem",
    });
  });

  it("returns an empty classNames string and empty style for no props", () => {
    expect(resolveSpacingProps({})).toEqual({ classNames: "", style: {} });
  });
});
