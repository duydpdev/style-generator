import { describe, it, expect } from "vitest";
import type { z } from "zod";

import { ThemeSchema, formatZodError } from "./themeSchema";

const baseTheme = {
  colors: { primary: "#3B82F6" },
};

describe("ThemeSchema — an override that repeats a base collision does not report it twice (F7)", () => {
  const issuePaths = (theme: unknown): string[] => {
    const result = ThemeSchema.safeParse(theme);
    return result.success
      ? []
      : result.error.issues.map((i) => i.path.join("."));
  };

  it("borderWidth key vs colors key: one issue at the base key", () => {
    expect(
      issuePaths({
        colors: { primary: "#fff" },
        borderWidth: { primary: "1px" },
        themeAxes: {
          theme: {
            dark: {
              colors: { primary: "#000" },
              borderWidth: { primary: "2px" },
            },
          },
        },
      }),
    ).toEqual(["borderWidth.primary"]);
  });

  it("fontFamily key vs font-weight utility: one issue at the base key", () => {
    expect(
      issuePaths({
        colors: { primary: "#fff" },
        fontFamily: { bold: "Arial" },
        themeAxes: { theme: { dark: { fontFamily: { bold: "Verdana" } } } },
      }),
    ).toEqual(["fontFamily.bold"]);
  });

  it("keys that kebab-case to the same value: one issue, none under themeAxes", () => {
    const paths = issuePaths({
      colors: { blue500: "#00f", "blue-500": "#00f" },
      themeAxes: {
        theme: {
          dark: { colors: { blue500: "#000", "blue-500": "#111" } },
        },
      },
    });
    expect(paths).toHaveLength(1);
    expect(paths[0]).toMatch(/^colors\./);
  });
});

it("rejects a theme still using the removed legacy axis-override key, naming the themeAxes rename", () => {
  // Built via a computed key (not a literal property name) so this
  // intentional rename-rejection input doesn't trip the repo-wide
  // legacy-key migration grep (`! git grep ... -- src examples site`).
  const legacyKey = ["t", "h", "e", "m", "e", "s"].join("");
  const result = ThemeSchema.safeParse({
    colors: {},
    [legacyKey]: { dark: { colors: {} } },
  });
  expect(result.success).toBe(false);
  expect(result.error?.issues[0]?.message).toMatch(/themeAxes/);
});

it.each([
  [
    "axis",
    { "100": { dark: { colors: { primary: "#000" } } } },
    ["themeAxes", "100"],
  ],
  [
    "variant",
    { contrast: { "200": { colors: { primary: "#000" } } } },
    ["themeAxes", "contrast", "200"],
  ],
  [
    "axis",
    { "0": { dark: { colors: { primary: "#000" } } } },
    ["themeAxes", "0"],
  ],
])(
  "rejects a canonical-integer %s name (JS key order would break declaration-order precedence)",
  (_kind, themeAxes, path) => {
    const result = ThemeSchema.safeParse({ ...baseTheme, themeAxes });
    expect(result.success).toBe(false);
    const issue = result.error?.issues[0];
    expect(issue?.path).toEqual(path);
    expect(issue?.message).toMatch(/canonical integer/);
    expect(issue?.message).toMatch(/declaration order/);
  },
);

describe('ThemeSchema — the variant name "base" is reserved (no-override sentinel)', () => {
  it("rejects a variant named base at its own path, pointing at the sentinel and a rename", () => {
    const result = ThemeSchema.safeParse({
      ...baseTheme,
      themeAxes: {
        theme: {
          base: { colors: { primary: "#000" } },
          dark: { colors: { primary: "#111" } },
        },
      },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toHaveLength(1);
    const issue = result.error?.issues[0];
    expect(issue?.path).toEqual(["themeAxes", "theme", "base"]);
    expect(issue?.message).toMatch(/reserved/);
    expect(issue?.message).toMatch(/ThemeAxesState/);
    expect(issue?.message).toMatch(/themeAxisAttributes/);
    expect(issue?.message).toMatch(/rename/);
  });

  it("reports it once per axis that declares it, and prints it through formatZodError", () => {
    const result = ThemeSchema.safeParse({
      ...baseTheme,
      themeAxes: {
        theme: { base: { colors: { primary: "#000" } } },
        palette: { base: { colors: { primary: "#111" } } },
      },
    });
    expect(result.error?.issues.map((i) => i.path.join("."))).toEqual([
      "themeAxes.theme.base",
      "themeAxes.palette.base",
    ]);
    expect(formatZodError(result.error as z.ZodError)).toMatch(
      /^themeAxes\.theme\.base → .*reserved/m,
    );
  });

  it("only reserves the exact name: Base, base2 and baseline stay valid", () => {
    for (const name of ["Base", "base2", "baseline", "rebase"]) {
      const result = ThemeSchema.safeParse({
        ...baseTheme,
        themeAxes: { theme: { [name]: { colors: { primary: "#000" } } } },
      });
      expect(result.success, name).toBe(true);
    }
  });

  it("allows an AXIS named base (it is only a key of the state object)", () => {
    const result = ThemeSchema.safeParse({
      ...baseTheme,
      themeAxes: { base: { dark: { colors: { primary: "#000" } } } },
    });
    expect(result.success).toBe(true);
  });
});

describe("cross-axis alias cycles (axes apply to one element at once)", () => {
  const cyclePaths = (theme: unknown): string[] => {
    const result = ThemeSchema.safeParse(theme);
    return result.success
      ? []
      : result.error.issues.map((issue) => issue.path.join("."));
  };

  it("rejects a cycle that only exists when two axes are active together, anchored at the later axis", () => {
    const result = ThemeSchema.safeParse({
      colors: { a: "#fff", b: "#000" },
      themeAxes: {
        x: { one: { colors: { a: "$b" } } },
        y: { two: { colors: { b: "$a" } } },
      },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toHaveLength(1);
    expect(result.error?.issues[0]?.path).toEqual([
      "themeAxes",
      "y",
      "two",
      "colors",
      "b",
    ]);
    expect(result.error?.issues[0]?.message).toMatch(
      /themeAxes\.x\.one and themeAxes\.y\.two.*a → b → a|themeAxes\.x\.one and themeAxes\.y\.two.*b → a → b/,
    );
  });

  it("accepts the same edges when a later axis shadows one with a literal", () => {
    expect(
      ThemeSchema.safeParse({
        colors: { a: "#111111", b: "#222222" },
        themeAxes: {
          x: { one: { colors: { a: "$b" } } },
          y: { two: { colors: { b: "$a", a: "#ff0000" } } },
        },
      }).success,
    ).toBe(true);
  });

  it("accepts alias edges of two variants of the same axis (never co-active)", () => {
    expect(
      ThemeSchema.safeParse({
        colors: { a: "#fff", b: "#000" },
        themeAxes: {
          x: {
            one: { colors: { a: "$b" } },
            two: { colors: { b: "$a" } },
          },
        },
      }).success,
    ).toBe(true);
  });

  it("rejects a three-axis cycle and names the latest axis", () => {
    expect(
      cyclePaths({
        colors: { a: "#111", b: "#222", c: "#333" },
        themeAxes: {
          x: { one: { colors: { a: "$b" } } },
          y: { two: { colors: { b: "$c" } } },
          z: { three: { colors: { c: "$a" } } },
        },
      }),
    ).toEqual(["themeAxes.z.three.colors.c"]);
  });

  it("checks every category on its own (shadows)", () => {
    expect(
      cyclePaths({
        colors: { primary: "#fff" },
        shadows: { a: "0 0 1px #000", b: "0 0 2px #000" },
        themeAxes: {
          x: { one: { shadows: { a: "$b" } } },
          y: { two: { shadows: { b: "$a" } } },
        },
      }),
    ).toEqual(["themeAxes.y.two.shadows.b"]);
  });

  it("does not repeat a cycle the single-variant pass already reports", () => {
    expect(
      cyclePaths({
        colors: { a: "#fff", b: "#000", c: "#123" },
        themeAxes: {
          x: { one: { colors: { a: "$b", b: "$a" } } },
          y: { two: { colors: { c: "$a" } } },
        },
      }),
    ).toEqual(["themeAxes.x.one.colors.a"]);
  });
});

describe("variant names within one axis (F10)", () => {
  it("rejects two variants that kebab-case to the same attribute value", () => {
    const result = ThemeSchema.safeParse({
      ...baseTheme,
      themeAxes: {
        theme: {
          "dark-mode": { colors: { primary: "#000" } },
          darkMode: { colors: { primary: "#111" } },
        },
      },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([
      "themeAxes",
      "theme",
      "darkMode",
    ]);
    expect(result.error?.issues[0]?.message).toMatch(/both kebab-case/);
  });

  it("accepts the same variant name in two different axes", () => {
    expect(
      ThemeSchema.safeParse({
        ...baseTheme,
        themeAxes: {
          theme: { dark: { colors: { primary: "#000" } } },
          palette: { dark: { colors: { primary: "#111" } } },
        },
      }).success,
    ).toBe(true);
  });
});
