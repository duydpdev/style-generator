import { describe, it, expect } from "vitest";
import type { z } from "zod";

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
      [
        "a color",
        "colors.primary_active",
        { colors: { primary_active: "#fff" } },
      ],
      [
        "a shadow",
        "shadows.drop_soft",
        { colors: { primary: "#fff" }, shadows: { drop_soft: "0 1px #000" } },
      ],
      [
        "a themeAxes axis name",
        "themeAxes.high_contrast",
        {
          colors: { primary: "#fff" },
          themeAxes: {
            high_contrast: { dark: { colors: { primary: "#000" } } },
          },
        },
      ],
      [
        "a themeAxes variant name",
        "themeAxes.theme.dark_mode",
        {
          colors: { primary: "#fff" },
          themeAxes: { theme: { dark_mode: { colors: { primary: "#000" } } } },
        },
      ],
      [
        "an override key",
        "themeAxes.theme.dark.colors.primary_x",
        {
          colors: { primary: "#fff", primary_x: "#111" },
          themeAxes: { theme: { dark: { colors: { primary_x: "#000" } } } },
        },
      ],
    ])("rejects `_` in %s at its own path", (_label, path, theme) => {
      const result = ThemeSchema.safeParse(theme);
      if (result.success) throw new Error("expected failure");
      const lines = formatZodError(result.error).split("\n");
      expect(
        lines.filter(
          (l) => l.startsWith(`${path} → `) && l.includes("`_` is not allowed"),
        ),
      ).toHaveLength(1);
    });

    it("rejects `_` in an alias target by the alias grammar, not as a missing target", () => {
      const result = ThemeSchema.safeParse({
        colors: { primary: "$blue_500", blue500: "#00f" },
      });
      if (result.success) throw new Error("expected failure");
      expect(formatZodError(result.error)).toMatch(
        /^colors\.primary → Alias value "\$blue_500" must match/m,
      );
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

  describe("leading-uppercase keys (review M3, D2)", () => {
    it.each([
      ["CTA", "cta"],
      ["ABtn", "abtn"],
      ["HTMLParser", "htmlparser"],
    ])("rejects %j with the rename that keeps its class", (key, rename) => {
      const result = ThemeSchema.safeParse({ colors: { [key]: "#fff" } });
      if (result.success) throw new Error("expected failure");
      expect(formatZodError(result.error)).toMatch(
        new RegExp(
          `^colors\\.${key} → Key "${key}" .*rename it to "${rename}"`,
          "m",
        ),
      );
    });

    it.each([
      [
        "a typography key",
        (k: string) => ({
          colors: { primary: "#fff" },
          typography: {
            [k]: {
              fontSize: "1rem",
              lineHeight: "1.5",
              fontWeight: 400,
              letterSpacing: "0",
            },
          },
        }),
        "typography",
      ],
      [
        "a themeAxes axis name",
        (k: string) => ({
          colors: { primary: "#fff" },
          themeAxes: { [k]: { on: { colors: { primary: "#000" } } } },
        }),
        "themeAxes",
      ],
    ])(
      "rejects them in %s, where the lowercase form parses",
      (_l, build, path) => {
        expect(ThemeSchema.safeParse(build("hc")).success).toBe(true);
        const result = ThemeSchema.safeParse(build("HC"));
        if (result.success) throw new Error("expected failure");
        expect(formatZodError(result.error)).toMatch(
          new RegExp(`^${path}\\.HC → Key "HC" .*rename it to "hc"`, "m"),
        );
      },
    );

    it.each(["primaryCTA", "Blue", "primaryFG", "2xl", "blue500"])(
      "accepts %j, whose class survives the camelCase round trip",
      (key) => {
        expect(
          ThemeSchema.safeParse({ colors: { [key]: "#fff" } }).success,
        ).toBe(true);
      },
    );

    it("reports a malformed key once, with the grammar message only", () => {
      const result = ThemeSchema.safeParse({ colors: { Bad_Key: "#fff" } });
      if (result.success) throw new Error("expected failure");
      const lines = formatZodError(result.error).split("\n");
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain("`_` is not allowed");
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

  describe("typography bounds and shadowing (V2-07)", () => {
    const style = {
      fontSize: "16px",
      lineHeight: "24px",
      fontWeight: 400,
    };
    const parse = (typography: Record<string, unknown>) =>
      ThemeSchema.safeParse({ colors: { primary: "#fff" }, typography });

    it.each([
      ["spacing", "spBody"],
      ["spacing", "sp-body"],
      ["font", "fontBold"],
    ])("rejects the %s-shadowing key %s", (_family, key) => {
      const result = parse({ [key]: style });
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((i) => i.path.join("."))).toContain(
        `typography.${key}`,
      );
    });

    it("accepts keys that merely start with the letters sp or font", () => {
      expect(
        parse({ spacious: style, fonts: style, footnote: style }).success,
      ).toBe(true);
    });

    it.each([[1], [400], [450.5], [1000]])(
      "accepts fontWeight %s",
      (fontWeight) => {
        expect(parse({ body: { ...style, fontWeight } }).success).toBe(true);
      },
    );

    it.each([[0], [0.5], [1001], [-100], [Number.NaN]])(
      "rejects fontWeight %s",
      (fontWeight) => {
        expect(parse({ body: { ...style, fontWeight } }).success).toBe(false);
      },
    );
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

  it("rejects a borderWidth key whose class equals a colors key's class (thin-line vs thinLine)", () => {
    const result = ThemeSchema.safeParse({
      colors: { "thin-line": "#fff" },
      borderWidth: { thinLine: "1px" },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["borderWidth", "thinLine"]);
    expect(result.error?.issues[0]?.message).toMatch(/border-thin-line/);
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

  describe("an override that repeats a base collision does not report it twice (F7)", () => {
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

  describe('the variant name "base" is reserved (no-override sentinel)', () => {
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
});

describe("bracket balance in values (X-02)", () => {
  it.each([
    "rgb(0 0 0",
    "calc((1px + 2px)",
    "rgb(0 0 0))",
    "[x",
    "a)b(",
    "var(--a]",
  ])("rejects %s at colors.primary", (value) => {
    const r = ThemeSchema.safeParse({ colors: { primary: value } });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(r.error.issues.map((i) => i.path.join("."))).toContain(
      "colors.primary",
    );
    expect(formatZodError(r.error)).toMatch(/^colors\.primary → /m);
  });

  it("rejects it inside typography and shadows too", () => {
    const shadows = ThemeSchema.safeParse({
      colors: { a: "#fff" },
      shadows: { sm: "0 1px 2px rgb(0 0 0" },
    });
    expect(shadows.error?.issues.map((i) => i.path.join("."))).toContain(
      "shadows.sm",
    );
    const typography = ThemeSchema.safeParse({
      colors: { a: "#fff" },
      typography: {
        body: {
          fontSize: "calc(1rem",
          lineHeight: "1.5",
          fontWeight: 400,
          letterSpacing: "0",
        },
      },
    });
    expect(typography.error?.issues.map((i) => i.path.join("."))).toContain(
      "typography.body.fontSize",
    );
  });

  it.each([
    "rgb(0 0 0 / 50%)",
    "calc(var(--a) * 2)",
    "linear-gradient(to right, rgb(0 0 0), rgb(255 255 255))",
    '"Plus Jakarta Sans", system-ui',
    '"Brand (Display", serif',
    "'a]b', serif",
    "#3B82F6",
  ])("accepts balanced value %s", (value) => {
    expect(ThemeSchema.safeParse({ colors: { primary: value } }).success).toBe(
      true,
    );
  });
});

describe("optional letterSpacing (X-12)", () => {
  it("accepts a typography entry without letterSpacing", () => {
    expect(
      ThemeSchema.safeParse({
        colors: { a: "#fff" },
        typography: {
          body: { fontSize: "16px", lineHeight: "1.5", fontWeight: 400 },
        },
      }).success,
    ).toBe(true);
  });
});
