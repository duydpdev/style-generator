import { describe, it, expect } from "vitest";
import { z } from "zod";

import { generate } from "./generate";

const theme = { colors: { primary: "#fff" } };

const issuesOf = (options: unknown) => {
  try {
    generate(theme, options as never);
    return [];
  } catch (e) {
    if (!(e instanceof z.ZodError)) throw e;
    return e.issues.map((i) => ({
      code: i.code,
      path: i.path.join("."),
      keys: "keys" in i ? i.keys : [],
    }));
  }
};

describe("generate() options validation (X-03)", () => {
  it("rejects an unknown top-level option key", () => {
    expect(issuesOf({ breakpoint: ["xl"] })).toContainEqual(
      expect.objectContaining({
        code: "unrecognized_keys",
        keys: ["breakpoint"],
      }),
    );
  });

  it.each([
    [{ enableResponsive: "no" }, "enableResponsive"],
    [{ spacing: { enabled: 0 } }, "spacing.enabled"],
    [{ typography: { cssVarDriven: "false" } }, "typography.cssVarDriven"],
  ])("rejects a non-boolean flag %o at %s", (o, path) => {
    expect(issuesOf(o).map((i) => i.path)).toContain(path);
  });

  it.each([
    [{ spacing: { enable: false } }, "spacing"],
    [{ typography: { cssVarDrivn: true } }, "typography"],
  ])("rejects an unknown nested key %o", (o, path) => {
    expect(issuesOf(o)).toContainEqual(
      expect.objectContaining({ code: "unrecognized_keys", path }),
    );
  });

  it.each(["banana", "80", "1px 2px", "calc(1px)", "10vw"])(
    "rejects screens.md = %s",
    (v) => {
      expect(issuesOf({ screens: { md: v } }).map((i) => i.path)).toContain(
        "screens.md",
      );
    },
  );

  it("rejects screens that mix units after merging with the px defaults", () => {
    expect(issuesOf({ screens: { xl: "80rem" } }).map((i) => i.path)).toContain(
      "screens",
    );
  });

  it("accepts rem screens when every default screen is overridden in rem", () => {
    expect(
      issuesOf({
        screens: {
          sm: "40rem",
          md: "48rem",
          lg: "64rem",
          xl: "80rem",
          "2xl": "96rem",
        },
        breakpoints: ["md", "xl"],
      }),
    ).toEqual([]);
  });

  it("rejects a breakpoint with no screen", () => {
    expect(
      issuesOf({ breakpoints: ["md", "tablet"] }).map((i) => i.path),
    ).toContain("breakpoints.1");
  });

  it("accepts a custom screen used as a breakpoint and the default screens", () => {
    expect(
      issuesOf({
        screens: { md: "800px", "3xl": "1920px" },
        breakpoints: ["sm", "md", "3xl", "2xl"],
      }),
    ).toEqual([]);
  });

  it("emits identical CSS for valid options", () => {
    expect(generate(theme, { breakpoints: ["md", "lg"] }).css).toBe(
      generate(theme).css,
    );
  });
});
