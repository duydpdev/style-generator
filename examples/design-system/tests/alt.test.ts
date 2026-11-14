import { describe, expect, it } from "vitest";
import { generate } from "@duydpdev/style-generator";

import {
  altBoxRecipe,
  altButtonRecipe,
  altIntents,
  altOptions,
  altTextRecipe,
  altTheme,
} from "../src/alt";
import { theme } from "../src/tokens";

type Loose = Readonly<Record<string, unknown>>;

const keysOf = (value: unknown): string[] =>
  value !== null && typeof value === "object" ? Object.keys(value) : [];

/**
 * The factories in `src/recipes/factories` are theme-free: the same files bind
 * to a theme that shares no key with `theme.json`, and only the preset in
 * `src/alt.ts` names its keys.
 */
describe("a second theme through the same factories", () => {
  it("shares no key with the sample theme in any category", () => {
    const base = theme as Loose;
    const alt = altTheme as Loose;
    const categories = Object.keys(alt).filter((key) => key !== "$schema");
    expect(categories.length).toBeGreaterThan(0);
    for (const category of categories) {
      const shared = keysOf(alt[category]).filter((key) =>
        keysOf(base[category]).includes(key),
      );
      expect({ category, shared }).toEqual({ category, shared: [] });
    }
  });

  it("generates CSS for the alt theme's own variables", () => {
    const { css } = generate(altTheme, altOptions);
    expect(css).toContain("--sg-color-brand:");
    expect(css).toContain("--sg-color-on-brand: var(--sg-color-paper);");
    expect(css).toContain('html[data-mode="night"]');
    expect(css).not.toContain("--sg-color-primary");
  });

  it("binds button, text and box recipes to the alt keys", () => {
    const button = altIntents.map((color) => ({
      color,
      fill: altButtonRecipe({ variant: "fill", color }),
      soft: altButtonRecipe({ variant: "soft", color, size: "lg" }),
    }));
    const text = altTextRecipe({ type: "caption", color: "ink" });
    const box = altBoxRecipe({ backgroundColor: "panel", rounded: "soft" });

    const all = [...button.flatMap((b) => [b.fill, b.soft]), text, box].join(
      " ",
    );
    expect(all).toContain("bg-brand");
    expect(all).toMatch(/\bhover:bg-brand-hover\b/);
    expect(all).toMatch(/\btext-on-brand\b/);
    expect(all).toMatch(/\brounded-soft\b/);
    expect(all).not.toMatch(/primary|text16Medium|text-16-medium/);
    expect({ button, text, box }).toMatchSnapshot();
  });
});
