import { describe, expect, it } from "vitest";

import { ThemeSchema } from "../core/themeSchema";

import { compileFixtureCss } from "./compileFixtureCss";

/**
 * The reason `fontFamily` keys `weight*`/`size*` are rejected: the
 * `--font-<kebab key>` variable the generator would emit lands in the
 * namespace Tailwind reads as the font-weight scale, so it is not a family
 * and overwrites `font-bold`.
 */
describe("fontFamily keys in the --font-weight-*/--font-size-* namespace", () => {
  it("Tailwind reads --font-weight-bold as the weight scale, not a family", async () => {
    const css = await compileFixtureCss(
      '@theme inline { --font-weight-bold: "Inter", sans-serif; }',
      ["font-bold"],
    );

    expect(css).toMatch(/\.font-bold\s*\{[^}]*--tw-font-weight:\s*"Inter"/);
    expect(css).not.toMatch(/\.font-bold\s*\{[^}]*font-family/);
  });

  it("the schema rejects the key that would emit it", () => {
    const result = ThemeSchema.safeParse({
      colors: { primary: "#fff" },
      fontFamily: { weightBold: '"Inter", sans-serif' },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["fontFamily", "weightBold"]);
  });
});
