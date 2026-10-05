import { describe, it, expect } from "vitest";

import {
  ELISION,
  THEME_CSS,
  THEME_JSON,
} from "../../site/src/data/build-sample";
import { generate } from "../core/generate";
import { ThemeSchema } from "../core/themeSchema";

describe("integration: landing-site build sample matches the library", () => {
  const theme: unknown = JSON.parse(THEME_JSON);

  it("THEME_JSON is a valid theme", () => {
    expect(ThemeSchema.safeParse(theme).success).toBe(true);
  });

  it("THEME_CSS is an in-order excerpt of the real generate() output", () => {
    const { css } = generate(ThemeSchema.parse(theme));
    const excerpts = THEME_CSS.split(ELISION)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    expect(excerpts.length).toBeGreaterThan(1);

    let cursor = 0;
    for (const excerpt of excerpts) {
      const at = css.indexOf(excerpt, cursor);
      expect(
        at,
        `not found in generate().css after ${String(cursor)}:\n${excerpt}`,
      ).toBeGreaterThanOrEqual(0);
      cursor = at + excerpt.length;
    }
  });
});
