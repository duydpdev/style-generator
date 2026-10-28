import { describe, it, expect } from "vitest";
import { z } from "zod";

import { defineTheme } from "./defineTheme";
import { generate } from "./generate";

/**
 * Run `fn` and return the issue paths of the `ZodError` it throws; fails the
 * test when it throws anything else or nothing at all.
 * @param {() => unknown} fn - Call expected to throw a `ZodError`
 * @returns {string[]} The issue paths, joined with `.`
 */
const zodIssuePaths = (fn: () => unknown): string[] => {
  let error: unknown;
  try {
    fn();
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(z.ZodError);
  return (error as z.ZodError).issues.map((i) => i.path.join("."));
};

const theme = defineTheme({
  colors: {
    primary: "#3B82F6",
    background: "#FFFFFF",
    sidebarForeground: "#111827",
  },
  typography: {
    text12Mono: {
      fontSize: "12px",
      lineHeight: "150%",
      fontWeight: 400,
      letterSpacing: "0px",
    },
    heading: {
      fontSize: "32px",
      lineHeight: "40px",
      fontWeight: 700,
      letterSpacing: "0",
    },
  },
  shadows: { sm: "0px 1px 2px rgba(0, 0, 0, 0.05)" },
  backDropBlurs: { sm: "4px" },
  borderRadius: { sm: "4px" },
  themeAxes: {
    theme: {
      dark: { colors: { primary: "#60A5FA", background: "#111827" } },
    },
  },
});

describe("generate", () => {
  it("returns { css, tokens, schema }", () => {
    const result = generate(theme);
    expect(typeof result.css).toBe("string");
    expect(result.tokens).toBeDefined();
    expect(result.schema).toBeDefined();
  });

  it("schema is the theme JSON Schema (z.toJSONSchema(ThemeSchema))", () => {
    const { schema } = generate(theme);
    expect(schema).toMatchObject({
      type: "object",
      additionalProperties: false,
      required: ["colors"],
    });
  });

  it("throws before generating CSS when the theme contains an injection-unsafe value", () => {
    expect(zodIssuePaths(() => generate({ colors: { a: "red;}" } }))).toContain(
      "colors.a",
    );
  });

  it("css contains the :root intermediate vars block", () => {
    const { css } = generate(theme);
    expect(css).toMatch(/:root\s*\{[^}]*--sg-color-primary:\s*#3B82F6/);
  });

  it("css contains the @theme inline mapping block", () => {
    const { css } = generate(theme);
    expect(css).toMatch(
      /@theme inline\s*\{[^}]*--color-primary:\s*var\(--sg-color-primary\)/,
    );
  });

  it("css contains @utility <kebab-key> for every typography key", () => {
    const { css } = generate(theme);
    expect(css).toMatch(/@utility text-12-mono \{/);
    expect(css).toMatch(/@utility heading \{/);
  });

  it("css never contains a bare top-level .class{} rule", () => {
    const { css } = generate(theme);
    expect(css).not.toMatch(/^\.[A-Za-z]/m);
  });

  it("emits no @utility border-* block: borderWidth classes come from the @theme namespace", () => {
    const { css } = generate({
      colors: { primary: "#fff" },
      borderWidth: { thin: "1px" },
    });
    expect(css).not.toMatch(/@utility border/);
    expect(css).toContain("--border-width-thin: var(--sg-border-width-thin);");
  });

  it("rejects an alias cycle that only exists once an override is merged on the base", () => {
    // Base alone is acyclic (b → a); the dark override turns a into $b.
    expect(
      zodIssuePaths(() =>
        generate({
          colors: { a: "#fff", b: "$a" },
          themeAxes: { theme: { dark: { colors: { a: "$b" } } } },
        }),
      ),
    ).toEqual(["themeAxes.theme.dark.colors.a"]);
  });

  it("tokens reflect the theme (typography/color/shadow/blur/rounded variants)", () => {
    const { tokens } = generate(theme);
    expect(tokens.Web.typography).toEqual(["text12Mono", "heading"]);
    expect(tokens.Web.colors).toContain("primary");
    expect(tokens.Web.shadows).toEqual(["sm"]);
    expect(tokens.Web.backDropBlurs).toEqual(["sm"]);
  });

  it("omits typography/spacing blocks when the theme has neither", () => {
    const { css } = generate(defineTheme({ colors: { primary: "#fff" } }), {
      spacing: { enabled: false },
    });
    expect(css).not.toMatch(/@utility/);
  });

  it("extraSources: emits one @source inline(...) per entry after the sp-* line", () => {
    const { css } = generate(theme, {
      extraSources: ["hover:bg-{primary,secondary}", "md:flex"],
    });
    expect(css).toMatch(
      /@source inline\("hover:bg-\{primary,secondary\}"\);\n@source inline\("md:flex"\);/,
    );
  });

  it('extraSources: throws on an entry that tries to escape the inline("…") string', () => {
    expect(
      zodIssuePaths(() =>
        generate(theme, { extraSources: ['x")@import "evil'] }),
      ),
    ).toContain("extraSources.0");
  });

  it("extraSources: throws on an empty entry", () => {
    expect(
      zodIssuePaths(() => generate(theme, { extraSources: [""] })),
    ).toContain("extraSources.0");
  });

  it("extraSources: throws on an entry longer than 512 characters", () => {
    expect(
      zodIssuePaths(() => generate(theme, { extraSources: ["a".repeat(513)] })),
    ).toContain("extraSources.0");
  });
});
