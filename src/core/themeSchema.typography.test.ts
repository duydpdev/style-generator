import { describe, it, expect } from "vitest";

import { ThemeSchema, formatZodError } from "./themeSchema";

describe("ThemeSchema — typography bounds and shadowing (V2-07)", () => {
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
  expect(fontFamilyResult.error?.issues[0]?.path).toEqual(["fontFamily", "a"]);
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

it("rejects a typography key equal to a new color-prefix class (ringPrimary next to colors.primary)", () => {
  const result = ThemeSchema.safeParse({
    colors: { primary: "#fff" },
    typography: {
      ringPrimary: { fontSize: "12px", lineHeight: "16px", fontWeight: 400 },
    },
  });
  expect(result.success).toBe(false);
  expect(result.error?.issues[0]?.path).toEqual(["typography", "ringPrimary"]);
  expect(result.error?.issues[0]?.message).toContain("ring-primary");
});

it.each(["x", "y", "x2", "x-2", "y10"])(
  "rejects the divider-width color key %s at colors.<key>",
  (key) => {
    const result = ThemeSchema.safeParse({ colors: { [key]: "#fff" } });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["colors", key]);
  },
);

it("rejects x-<k> only when <k> is a borderWidth key", () => {
  const rejected = ThemeSchema.safeParse({
    colors: { xThin: "#fff" },
    borderWidth: { thin: "1px" },
  });
  expect(rejected.success).toBe(false);
  expect(rejected.error?.issues[0]?.path).toEqual(["colors", "xThin"]);
  expect(
    ThemeSchema.safeParse({
      colors: { xThin: "#fff" },
      borderWidth: { hairline: "1px" },
    }).success,
  ).toBe(true);
});

it.each(["xl", "yellow", "xReverse", "x2l", "box"])(
  "accepts the color key %s",
  (key) => {
    expect(ThemeSchema.safeParse({ colors: { [key]: "#fff" } }).success).toBe(
      true,
    );
  },
);

it("formats the divider collision as one path → message line", () => {
  const result = ThemeSchema.safeParse({ colors: { x: "#fff" } });
  if (result.success) throw new Error("expected failure");
  expect(formatZodError(result.error)).toMatch(
    /^colors\.x → colors key "x" collides with Tailwind's divider utility "divide-x" \(borderWidth divide-x\/y scale\) — rename it\.$/m,
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

it.each(["weightBold", "weight", "sizeLg", "size-xl"])(
  "rejects fontFamily key %s: --font-<key> is Tailwind's weight/size scale namespace",
  (key) => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      fontFamily: { [key]: "Arial" },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["fontFamily", key]);
    expect(result.error?.issues[0]?.message).toMatch(/weight\/font-size/);
  },
);

it("accepts fontFamily keys that only start with the letters weight/size", () => {
  expect(
    ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      fontFamily: { weighty: "Arial", sizeable: "Arial", sans: "Arial" },
    }).success,
  ).toBe(true);
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

describe("typography keys vs other categories' classes (F9)", () => {
  const style = {
    fontSize: "16px",
    lineHeight: "24px",
    fontWeight: 400,
  };

  it.each([
    ["colors", { colors: { primary: "#fff" } }, "textPrimary"],
    ["colors (bg-)", { colors: { primary: "#fff" } }, "bgPrimary"],
    [
      "borderWidth",
      { colors: { primary: "#fff" }, borderWidth: { thin: "1px" } },
      "borderThin",
    ],
    [
      "shadows",
      { colors: { primary: "#fff" }, shadows: { base: "0 0 1px #000" } },
      "shadowBase",
    ],
    [
      "borderRadius",
      { colors: { primary: "#fff" }, borderRadius: { lg: "8px" } },
      "roundedLg",
    ],
    [
      "backDropBlurs",
      { colors: { primary: "#fff" }, backDropBlurs: { md: "12px" } },
      "backdropBlurMd",
    ],
  ])("rejects a typography key equal to a %s class", (_label, theme, key) => {
    const result = ThemeSchema.safeParse({
      ...theme,
      typography: { [key]: style },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toHaveLength(1);
    expect(result.error?.issues[0]?.path).toEqual(["typography", key]);
  });

  it("compares kebab forms: textPrimary collides with colors.primary in kebab-keyed form too", () => {
    const result = ThemeSchema.safeParse({
      colors: { "primary-dark": "#fff" },
      typography: { textPrimaryDark: style },
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([
      "typography",
      "textPrimaryDark",
    ]);
  });

  it("does not flag typography keys that merely resemble a prefix", () => {
    expect(
      ThemeSchema.safeParse({
        colors: { primary: "#fff" },
        typography: {
          text12Mono: style,
          heading: style,
          textHeading: style,
          textSecondary: style,
        },
      }).success,
    ).toBe(true);
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
