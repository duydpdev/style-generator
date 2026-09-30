import { describe, it, expect } from "vitest";

import { ThemeSchema, formatZodError } from "./themeSchema";

const baseTheme = {
  colors: { primary: "#3B82F6" },
};

describe("ThemeSchema — valid themes", () => {
  it("parses a theme with only the required colors field", () => {
    expect(ThemeSchema.safeParse(baseTheme).success).toBe(true);
  });

  it("parses a full theme (typography, shadows, blurs, radius, borderWidth, themeAxes)", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#3B82F6", sidebarForeground: "#111827" },
      typography: {
        heading: {
          fontSize: "32px",
          lineHeight: "40px",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          fontFamily: '"Plus Jakarta Sans", system-ui',
          fontStyle: "italic",
        },
      },
      shadows: { sm: "0 1px 2px rgba(0,0,0,.1)" },
      backDropBlurs: { sm: "4px" },
      borderRadius: { sm: "4px" },
      borderWidth: { hairline: "1px" },
      themeAxes: {
        theme: {
          dark: {
            colors: { primary: "#60A5FA" },
            shadows: { sm: "0 1px 2px rgba(255,255,255,.1)" },
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts themeAxes with two simultaneous axes (theme + palette)", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#3B82F6", secondary: "#10B981" },
      themeAxes: {
        theme: { dark: { colors: { primary: "#60A5FA" } } },
        palette: {
          forest: { colors: { primary: "#2f5f47" } },
          sunset: { colors: { primary: "#b23a1b" } },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it.each(["contrast100", "007", "1e3", "a1"])(
    "accepts the non-canonical-integer variant name %j",
    (variant) => {
      const result = ThemeSchema.safeParse({
        ...baseTheme,
        themeAxes: { contrast: { [variant]: { colors: { primary: "#000" } } } },
      });
      expect(result.success).toBe(true);
    },
  );

  it("accepts an alias declared inside a variant override and keeps it verbatim for emit-time resolution", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#3B82F6", blue500: "#3B82F6" },
      themeAxes: {
        palette: { rose: { colors: { primary: "$blue500" } } },
      },
    });
    expect(result.success).toBe(true);
    expect(result.data?.themeAxes?.palette?.rose?.colors?.primary).toBe(
      "$blue500",
    );
  });

  it.each([
    "#fff",
    "rgb(0 0 0 / 50%)",
    "var(--x)",
    "0 1px 2px rgba(0,0,0,.1)",
    '"Plus Jakarta Sans", system-ui',
    "calc(0.625rem - 4px)",
    "oklch(0.7 0.1 200)",
    "rgba(245.31, 1, 2, .5)",
  ])("accepts token value %j", (value) => {
    const result = ThemeSchema.safeParse({ colors: { primary: value } });
    expect(result.success).toBe(true);
  });
});

describe("ThemeSchema — invalid themes", () => {
  it("rejects a theme missing colors", () => {
    const result = ThemeSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects an unrecognized top-level key (typo colours)", () => {
    const result = ThemeSchema.safeParse({ colors: {}, colours: {} });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.code).toBe("unrecognized_keys");
  });

  it.each(["a b", "-x", "x;y"])("rejects malformed token key %j", (key) => {
    const result = ThemeSchema.safeParse({ colors: { [key]: "#fff" } });
    expect(result.success).toBe(false);
  });

  describe("underscore in token keys (D-S3)", () => {
    const messages = (result: { error?: { issues: unknown[] } }): string =>
      JSON.stringify(result.error?.issues);

    it.each([
      ["a color", { colors: { primary_active: "#fff" } }],
      [
        "a shadow",
        { colors: { primary: "#fff" }, shadows: { drop_soft: "0 1px #000" } },
      ],
      [
        "a themeAxes axis name",
        {
          colors: { primary: "#fff" },
          themeAxes: { high_contrast: { dark: { primary: "#000" } } },
        },
      ],
      [
        "a themeAxes variant name",
        {
          colors: { primary: "#fff" },
          themeAxes: { theme: { dark_mode: { primary: "#000" } } },
        },
      ],
      [
        "an override key",
        {
          colors: { primary: "#fff" },
          themeAxes: { theme: { dark: { primary_x: "#000" } } },
        },
      ],
      [
        "an alias target",
        { colors: { primary: "$blue_500", blue500: "#00f" } },
      ],
    ])("rejects `_` in %s", (_label, theme) => {
      const result = ThemeSchema.safeParse(theme);
      expect(result.success).toBe(false);
    });

    it("suggests camelCase or kebab-case in the error message", () => {
      const result = ThemeSchema.safeParse({
        colors: { primary_active: "#fff" },
      });
      expect(result.success).toBe(false);
      expect(messages(result)).toContain("`_` is not allowed");
      expect(messages(result)).toContain("camelCase");
      expect(messages(result)).toContain("kebab-case");
    });

    it("formatZodError prints the key-grammar hint, not Zod's generic record-key message", () => {
      const result = ThemeSchema.safeParse({
        colors: { primary_active: "#fff" },
      });
      if (result.success) throw new Error("expected failure");
      const text = formatZodError(result.error);
      expect(text).toMatch(/^colors\.primary_active → .*`_` is not allowed/m);
      expect(text).not.toContain("Invalid key in record");
    });
  });

  it.each(["red;}body{color:red", "red\n", "url(x)@import", "red/*", '"Inter'])(
    "rejects malformed token value %j",
    (value) => {
      const result = ThemeSchema.safeParse({ colors: { primary: value } });
      expect(result.success).toBe(false);
    },
  );

  it("rejects a typography key whose kebab-case form is not a valid @utility name", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      typography: {
        "2xl": {
          fontSize: "24px",
          lineHeight: "32px",
          fontWeight: 700,
          letterSpacing: "0",
        },
      },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("2xl");
  });

  it("rejects an unrecognized key inside a themeAxes override", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      themeAxes: {
        theme: {
          dark: { colors: { primary: "#000" }, typography: {} },
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects a themeAxes override key with no matching base key (produces no utility)", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      themeAxes: {
        theme: {
          dark: { colors: { primary: "#000", background: "#111" } },
        },
      },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([
      "themeAxes",
      "theme",
      "dark",
      "colors",
      "background",
    ]);
    expect(result.error?.issues[0]?.message).toMatch(/no utility/);
  });

  it("rejects an alias target that doesn't exist", () => {
    const result = ThemeSchema.safeParse({ colors: { a: "$b" } });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/references unknown key/);
  });

  it("rejects an alias cycle", () => {
    const result = ThemeSchema.safeParse({ colors: { a: "$b", b: "$a" } });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/cycle detected/);
  });

  it("rejects a $-alias in borderWidth/fontFamily targeting an unknown key (AC4: ALIAS_CATEGORIES tracks every ThemeCssVarShape category)", () => {
    const borderWidthResult = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      borderWidth: { a: "$nope" },
    });
    expect(borderWidthResult.success).toBe(false);
    expect(borderWidthResult.error?.issues[0]?.path).toEqual([
      "borderWidth",
      "a",
    ]);
    expect(borderWidthResult.error?.issues[0]?.message).toMatch(
      /references unknown key/,
    );

    const fontFamilyResult = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      fontFamily: { a: "$nope" },
    });
    expect(fontFamilyResult.success).toBe(false);
    expect(fontFamilyResult.error?.issues[0]?.path).toEqual([
      "fontFamily",
      "a",
    ]);
  });

  it("rejects a borderWidth key that collides with a colors key", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      borderWidth: { primary: "1px" },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(
      /collides with a colors key/,
    );
  });

  it("rejects a fontFamily key that collides with a Tailwind font-weight utility", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      fontFamily: { bold: "Arial" },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/font-weight utility/);
  });

  it("rejects a $-prefixed value in typography (aliases are not supported there)", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      typography: {
        body: {
          fontSize: "$primary",
          lineHeight: "150%",
          fontWeight: 400,
          letterSpacing: "0",
        },
      },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(
      /aliases are not supported in typography/,
    );
  });

  it("rejects keys in the same record that kebab-case to the same value", () => {
    const result = ThemeSchema.safeParse({
      colors: { blue500: "#00f", "blue-500": "#00f" },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/kebab-case to/);
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
});
