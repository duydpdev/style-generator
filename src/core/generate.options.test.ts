import { describe, it, expect } from "vitest";
import { z } from "zod";

import { generate } from "./generate";
import type { StyleGeneratorOptions } from "./Options";
import { formatZodError, type ThemeConfig } from "./themeSchema";

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
  });

  it("`coverage: false` drops a category's @source inline lines from the generated CSS", () => {
    const css = generate(theme, { coverage: { colors: false } }).css;
    expect(css).not.toContain("{bg,text,border}-{primary}");
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
      /^coverage\.colors\.prefixes\.0 → Unknown class prefix "bgg" for "colors"; expected one of: bg, text, border$/m,
    );
    expect(text({ coverage: { colors: "off" } })).toMatch(
      /^coverage\.colors → Expected a boolean or \{ prefixes/m,
    );
  });
});

describe("generate() axes option", () => {
  const axesTheme = {
    colors: { brand: "#00f", primary: "$brand", surface: "#fff" },
    shadows: { soft: "0 1px 2px #000", base: "$soft" },
    themeAxes: {
      theme: { dark: { colors: { brand: "#0af" } } },
      palette: { forest: { colors: { surface: "#020" } } },
    },
  } satisfies ThemeConfig;

  const issuesFor = (
    t: ThemeConfig,
    options: StyleGeneratorOptions,
  ): { path: string; message: string }[] => {
    try {
      generate(t, options);
      return [];
    } catch (e) {
      if (!(e instanceof z.ZodError)) throw e;
      return e.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
    }
  };

  describe("schema", () => {
    it.each([
      ["an unknown axes key", { axes: { mode: "dark" } }, "axes"],
      ["an unknown scope", { axes: { scope: "shadow" } }, "axes.scope"],
      [
        "a function attribute",
        { axes: { attribute: () => "x" } },
        "axes.attribute",
      ],
      [
        "a selector-breaking attribute value",
        { axes: { attribute: { theme: 'x"] { color: red } [y' } } },
        "axes.attribute.theme",
      ],
      [
        "an attribute value starting with a digit",
        { axes: { attribute: { theme: "1mode" } } },
        "axes.attribute.theme",
      ],
      [
        "an attribute value with a space",
        { axes: { attribute: { theme: "data mode" } } },
        "axes.attribute.theme",
      ],
      [
        "an empty attribute value",
        { axes: { attribute: { theme: "" } } },
        "axes.attribute.theme",
      ],
      [
        "an uppercase attribute value",
        { axes: { attribute: { theme: "dataMode" } } },
        "axes.attribute.theme",
      ],
    ])("rejects %s", (_label, options, path) => {
      expect(issuesOf(options).map((i) => i.path)).toContain(path);
    });

    it("rejects an attribute map key outside the token-key grammar", () => {
      expect(
        issuesOf({ axes: { attribute: { "the me": "data-x" } } }).length,
      ).toBeGreaterThan(0);
    });

    it("accepts every documented form", () => {
      expect(
        issuesFor(axesTheme, {
          axes: { attribute: { theme: "data-mode", palette: "data-p-2" } },
        }),
      ).toEqual([]);
      expect(issuesOf({ axes: { scope: "root" } })).toEqual([]);
      expect(issuesOf({ axes: { scope: "element" } })).toEqual([]);
      expect(issuesOf({ axes: {} })).toEqual([]);
    });

    it("validates the options before the theme", () => {
      const badTheme = { colors: { primary: "{" } } as ThemeConfig;
      const paths = issuesFor(badTheme, {
        axes: { scope: "shadow" as never },
      }).map((i) => i.path);
      expect(paths).toEqual(["axes.scope"]);
    });
  });

  describe("selector", () => {
    it("defaults to html[data-<axis>] and is unchanged by an empty axes", () => {
      const css = generate(axesTheme).css;
      expect(css).toContain('html[data-theme="dark"] {');
      expect(css).toContain('html[data-palette="forest"] {');
      expect(generate(axesTheme, { axes: {} }).css).toBe(css);
      expect(generate(axesTheme, { axes: { scope: "root" } }).css).toBe(css);
    });

    it("renames only the listed axes", () => {
      const css = generate(axesTheme, {
        axes: { attribute: { theme: "data-mode" } },
      }).css;
      expect(css).toContain('html[data-mode="dark"] {');
      expect(css).not.toContain('html[data-theme="dark"]');
      expect(css).toContain('html[data-palette="forest"] {');
    });

    it('drops the html anchor with scope "element"', () => {
      const t: ThemeConfig = {
        colors: { brand: "#00f", surface: "#fff" },
        themeAxes: { theme: { dark: { colors: { surface: "#000" } } } },
      };
      const css = generate(t, {
        axes: { scope: "element", attribute: { theme: "data-mode" } },
      }).css;
      expect(css).toContain('\n[data-mode="dark"] {');
      expect(css).not.toContain("html[");
    });
  });

  describe('scope "element" alias safety', () => {
    const element = { axes: { scope: "element" } } as const;

    it("rejects a variant that overrides an alias target without re-declaring the holder", () => {
      const issues = issuesFor(axesTheme, element);
      expect(issues).toHaveLength(1);
      expect(issues[0]?.path).toBe("themeAxes.theme.dark.colors.brand");
      expect(issues[0]?.message).toContain("theme.colors.primary");
    });

    it('accepts the same theme under scope "root"', () => {
      expect(issuesFor(axesTheme, { axes: { scope: "root" } })).toEqual([]);
    });

    it.each([
      ["a literal", "#0cf"],
      ["the same alias", "$brand"],
    ])("accepts a holder re-declared as %s", (_label, value) => {
      const t: ThemeConfig = {
        ...axesTheme,
        themeAxes: {
          theme: { dark: { colors: { brand: "#0af", primary: value } } },
        },
      };
      expect(issuesFor(t, element)).toEqual([]);
    });

    it("accepts an override of the holder itself or of a key nothing aliases", () => {
      const t: ThemeConfig = {
        ...axesTheme,
        themeAxes: {
          theme: { dark: { colors: { primary: "#111", surface: "#222" } } },
        },
      };
      expect(issuesFor(t, element)).toEqual([]);
    });

    it("follows an alias chain: every holder up the chain is reported at the overridden key", () => {
      const t: ThemeConfig = {
        colors: { c: "#000", b: "$c", a: "$b" },
        themeAxes: { theme: { dark: { colors: { c: "#fff" } } } },
      };
      const issues = issuesFor(t, element);
      expect(issues.map((i) => i.path)).toEqual([
        "themeAxes.theme.dark.colors.c",
        "themeAxes.theme.dark.colors.c",
      ]);
      expect(issues[0]?.message).toContain("theme.colors.b");
      expect(issues[0]?.message).toContain(
        'variant "theme.dark" overrides "c"',
      );
      expect(issues[1]?.message).toContain("theme.colors.a");
      expect(issues[1]?.message).toContain('"b" is itself stale');
    });

    it("stops at a re-declared link of the chain", () => {
      const t: ThemeConfig = {
        colors: { c: "#000", b: "$c", a: "$b" },
        themeAxes: { theme: { dark: { colors: { c: "#fff", b: "$c" } } } },
      };
      // `b` is re-declared (its alias now resolves on the element), but `a`
      // still aliases `b` and keeps the :root value.
      expect(issuesFor(t, element).map((i) => i.path)).toEqual([
        "themeAxes.theme.dark.colors.b",
      ]);
    });

    it("checks every CSS-var category, not only colors", () => {
      const t: ThemeConfig = {
        colors: { primary: "#fff" },
        shadows: { soft: "0 1px 2px #000", base: "$soft" },
        themeAxes: {
          theme: { dark: { shadows: { soft: "0 1px 2px #fff" } } },
        },
      };
      const issues = issuesFor(t, element);
      expect(issues.map((i) => i.path)).toEqual([
        "themeAxes.theme.dark.shadows.soft",
      ]);
      expect(issues[0]?.message).toContain("theme.shadows.base");
    });

    it("reports one issue per stale holder across variants", () => {
      const t: ThemeConfig = {
        colors: { brand: "#00f", primary: "$brand", accent: "$brand" },
        themeAxes: {
          theme: {
            dark: { colors: { brand: "#0af" } },
            light: { colors: { brand: "#fff", accent: "#eee" } },
          },
        },
      };
      expect(issuesFor(t, element).map((i) => i.path)).toEqual([
        "themeAxes.theme.dark.colors.brand",
        "themeAxes.theme.dark.colors.brand",
        "themeAxes.theme.light.colors.brand",
      ]);
    });

    it.each([
      [
        "variants of one axis (nested elements can carry different values)",
        {
          theme: {
            dark: { colors: { primary: "$brand" } },
            light: { colors: { brand: "#fff" } },
          },
        },
        "themeAxes.theme.light.colors.brand",
      ],
      [
        "variants of two axes",
        {
          theme: { dark: { colors: { primary: "$brand" } } },
          palette: { light: { colors: { brand: "#fff" } } },
        },
        "themeAxes.palette.light.colors.brand",
      ],
    ])(
      "also treats an alias written in another variant as a holder: %s",
      (_label, themeAxes, path) => {
        const t: ThemeConfig = {
          colors: { brand: "#00f", primary: "#f00" },
          themeAxes,
        };
        const issues = issuesFor(t, element);
        expect(issues.map((i) => i.path)).toEqual([path]);
        expect(issues[0]?.message).toContain("theme.colors.primary");
        expect(issues[0]?.message).toContain("dark");
        expect(issues[0]?.message).toContain('re-declare "primary"');
        expect(issuesFor(t, { axes: { scope: "root" } })).toEqual([]);
      },
    );

    it("accepts the other-variant holder when the variant re-declares it", () => {
      const t: ThemeConfig = {
        colors: { brand: "#00f", primary: "#f00" },
        themeAxes: {
          theme: {
            dark: { colors: { primary: "$brand" } },
            light: { colors: { brand: "#fff", primary: "#eee" } },
          },
        },
      };
      expect(issuesFor(t, element)).toEqual([]);
    });

    it("follows a chain whose links are declared in another variant", () => {
      const t: ThemeConfig = {
        colors: { c: "#000", b: "#111", a: "#222" },
        themeAxes: {
          theme: {
            dark: { colors: { b: "$c", a: "$b" } },
            light: { colors: { c: "#fff" } },
          },
        },
      };
      const issues = issuesFor(t, element);
      expect(issues.map((i) => i.path)).toEqual([
        "themeAxes.theme.light.colors.c",
        "themeAxes.theme.light.colors.c",
      ]);
      expect(issues[1]?.message).toContain("itself stale");
    });

    it.each(["root", "element"] as const)(
      'rejects an axes.attribute key that names no themeAxes axis (scope "%s")',
      (scope) => {
        const issues = issuesFor(axesTheme, {
          axes: {
            scope,
            attribute: { ghost: "data-ghost", palette: "data-p" },
          },
        });
        expect(issues.map((i) => i.path)).toContain("axes.attribute.ghost");
        expect(issues.map((i) => i.path)).not.toContain(
          "axes.attribute.palette",
        );
      },
    );

    it.each(["root", "element"] as const)(
      'rejects two axes that resolve to one attribute name (scope "%s")',
      (scope) => {
        // `theme` is renamed onto the name `palette` already has by default.
        const issues = issuesFor(axesTheme, {
          axes: { scope, attribute: { theme: "data-palette" } },
        });
        const clash = issues.filter((i) => i.path === "axes.attribute.theme");
        expect(clash).toHaveLength(1);
        expect(clash[0]?.message).toContain('"data-palette"');
        expect(clash[0]?.message).toContain('"theme"');
        expect(clash[0]?.message).toContain('"palette"');
      },
    );

    it("rejects two explicit entries that name the same attribute, at the later axis", () => {
      const issues = issuesFor(axesTheme, {
        axes: { attribute: { theme: "data-x", palette: "data-x" } },
      });
      expect(issues.map((i) => i.path)).toEqual(["axes.attribute.palette"]);
    });

    it("reports through formatZodError as `path → message`", () => {
      try {
        generate(axesTheme, element);
        expect.unreachable();
      } catch (e) {
        if (!(e instanceof z.ZodError)) throw e;
        expect(formatZodError(e)).toMatch(
          /^themeAxes\.theme\.dark\.colors\.brand → /m,
        );
      }
    });
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
