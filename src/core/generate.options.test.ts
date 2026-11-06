import { describe, it, expect } from "vitest";
import { z } from "zod";

import {
  issuesOf,
  theme,
} from "../__integration__/__fixtures__/generateIssues";

import { generate } from "./generate";
import { formatZodError, type ThemeConfig } from "./themeSchema";

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

  it.each([
    ["an empty list", { p: [] }],
    ["the 4.x object form", { p: { padding: "var(--sg-sp-p)" } }],
  ])("rejects spacing.properties.p as %s", (_label, properties) => {
    expect(issuesOf({ spacing: { properties } }).map((i) => i.path)).toContain(
      "spacing.properties.p",
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

describe("generate() coverage validation", () => {
  it.each([
    [{ coverage: { color: false } }, "coverage"],
    [{ coverage: { colors: "off" } }, "coverage.colors"],
    [{ coverage: { colors: { keys: "some" } } }, "coverage.colors"],
    [{ coverage: { colors: { prefixes: [] } } }, "coverage.colors.prefixes"],
    [
      { coverage: { colors: { prefixes: ["bgg"] } } },
      "coverage.colors.prefixes.0",
    ],
    [
      { coverage: { borderRadius: { prefixes: ["rounded", "border"] } } },
      "coverage.borderRadius.prefixes.1",
    ],
    [
      { coverage: { typography: { prefixes: ["text"] } } },
      "coverage.typography.prefixes.0",
    ],
    [
      { coverage: { typography: { keys: "aliased" } } },
      "coverage.typography.keys",
    ],
    [{ coverage: { colors: { extra: true } } }, "coverage.colors"],
    [{ coverage: { colors: { opacities: [] } } }, "coverage.colors.opacities"],
    [
      { coverage: { colors: { opacities: [0] } } },
      "coverage.colors.opacities.0",
    ],
    [
      { coverage: { colors: { opacities: [10, 101] } } },
      "coverage.colors.opacities.1",
    ],
    [
      { coverage: { colors: { opacities: [10, 20, 10] } } },
      "coverage.colors.opacities",
    ],
    [{ coverage: { colors: { opacities: [12.5] } } }, "coverage.colors"],
    [{ coverage: { colors: { opacities: ["10"] } } }, "coverage.colors"],
    [
      { coverage: { shadows: { opacities: [10] } } },
      "coverage.shadows.opacities",
    ],
    [
      { coverage: { typography: { opacities: [10] } } },
      "coverage.typography.opacities",
    ],
    [
      { coverage: { borderWidth: { opacities: [10] } } },
      "coverage.borderWidth.opacities",
    ],
  ])("rejects %o with an issue at %s", (options, path) => {
    expect(issuesOf(options).map((i) => i.path)).toContain(path);
  });

  it("accepts every documented coverage form", () => {
    expect(
      issuesOf({
        coverage: {
          colors: false,
          shadows: true,
          borderRadius: { prefixes: ["rounded", "rounded-t"] },
          borderWidth: { keys: "aliased" },
          typography: { keys: "all" },
          fontFamily: {},
        },
      }),
    ).toEqual([]);
    expect(
      issuesOf({
        coverage: {
          colors: { prefixes: ["ring", "outline", "divide", "placeholder"] },
        },
      }),
    ).toEqual([]);
  });

  it("accepts `opacities` on colors, alone or with prefixes and keys", () => {
    expect(
      issuesOf({ coverage: { colors: { opacities: [1, 10, 100] } } }),
    ).toEqual([]);
    expect(
      issuesOf({
        coverage: {
          colors: { prefixes: ["bg"], keys: "aliased", opacities: [10] },
        },
      }),
    ).toEqual([]);
  });

  it("tokens.Web.opacities and the @source inline opacity line come from the same steps", () => {
    const { css, tokens } = generate(theme, {
      coverage: { colors: { opacities: [50, 10] } },
    });
    expect(tokens.Web.opacities).toEqual([10, 50]);
    expect(css).toContain("/{10,50}");
  });

  it("`coverage: false` drops a category's @source inline lines from the generated CSS", () => {
    const css = generate(theme, { coverage: { colors: false } }).css;
    expect(generate(theme).css).toContain(
      "{bg,text,border,ring,outline,divide,placeholder}-{primary}",
    );
    expect(css).not.toContain(
      "{bg,text,border,ring,outline,divide,placeholder}-{primary}",
    );
    expect(generate(theme, { coverage: { colors: true } }).css).toBe(
      generate(theme).css,
    );
  });

  it("reports a malformed coverage with a readable `path → message` line", () => {
    const text = (options: unknown): string => {
      try {
        generate(theme, options as never);
      } catch (e) {
        if (e instanceof z.ZodError) return formatZodError(e);
        throw e;
      }
      return "";
    };
    expect(text({ coverage: { colors: { prefixes: ["bgg"] } } })).toMatch(
      /^coverage\.colors\.prefixes\.0 → Unknown class prefix "bgg" for "colors"; expected one of: bg, text, border, ring, outline, divide, placeholder$/m,
    );
    expect(text({ coverage: { colors: "off" } })).toMatch(
      /^coverage\.colors → Expected a boolean or \{ prefixes/m,
    );
    expect(text({ coverage: { shadows: { opacities: [10] } } })).toMatch(
      /^coverage\.shadows\.opacities → "shadows" utilities take no `\/<n>` opacity modifier \(only color utilities do\)$/m,
    );
    expect(text({ coverage: { colors: { opacities: [10, 10] } } })).toMatch(
      /^coverage\.colors\.opacities → Opacity steps must be unique$/m,
    );
  });
});

describe("generate() resetTailwindDefaults option", () => {
  const full: ThemeConfig = {
    colors: { primary: "#fff" },
    borderRadius: { md: "6px" },
    shadows: { soft: "0 1px 2px #0003" },
  };

  const issuesFor = (t: ThemeConfig, options: unknown) => {
    try {
      generate(t, options as never);
      return [];
    } catch (e) {
      if (!(e instanceof z.ZodError)) throw e;
      return e.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
    }
  };

  it.each([
    [{ resetTailwindDefaults: "colors" }, "resetTailwindDefaults"],
    [{ resetTailwindDefaults: ["fonts"] }, "resetTailwindDefaults.0"],
    [{ resetTailwindDefaults: ["colors", 1] }, "resetTailwindDefaults.1"],
    [{ resetTailwindDefaults: [["colors"]] }, "resetTailwindDefaults.0"],
  ])("rejects %o at %s", (options, path) => {
    expect(issuesOf(options).map((i) => i.path)).toContain(path);
  });

  it("accepts every namespace on a theme that replaces them", () => {
    expect(
      issuesFor(full, {
        resetTailwindDefaults: ["colors", "radius", "shadow"],
      }),
    ).toEqual([]);
    expect(issuesFor(full, { resetTailwindDefaults: [] })).toEqual([]);
  });

  it("rejects radius without borderRadius and shadow without shadows, naming the category", () => {
    const issues = issuesFor(
      { colors: { primary: "#fff" } },
      { resetTailwindDefaults: ["radius", "shadow"] },
    );
    expect(issues.map((i) => i.path)).toEqual([
      "resetTailwindDefaults.0",
      "resetTailwindDefaults.1",
    ]);
    expect(issues[0]?.message).toContain('"borderRadius"');
    expect(issues[1]?.message).toContain('"shadows"');
  });

  it("needs only the matching category: radius is fine without shadows", () => {
    expect(
      issuesFor(
        { colors: { primary: "#fff" }, borderRadius: { md: "6px" } },
        { resetTailwindDefaults: ["radius"] },
      ),
    ).toEqual([]);
  });

  it("validates the options before the theme", () => {
    expect(
      issuesFor(
        { colors: { primary: "{" } },
        {
          resetTailwindDefaults: ["fonts"],
        },
      ).map((i) => i.path),
    ).toEqual(["resetTailwindDefaults.0"]);
  });

  it("does not change the typed tokens", () => {
    expect(
      generate(full, { resetTailwindDefaults: ["colors"] }).tokens,
    ).toEqual(generate(full).tokens);
  });
});
