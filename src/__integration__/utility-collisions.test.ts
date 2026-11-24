import postcss from "postcss";
import { describe, expect, it } from "vitest";

import {
  TAILWIND_COLOR_NUMERIC_ROOTS,
  TAILWIND_COLOR_STATIC_CLASSES,
  TAILWIND_NUMERIC_UTILITY_ROOTS,
  TAILWIND_SCALE_COLLISIONS,
  TAILWIND_STATIC_UTILITY_NAMES,
  findUtilityCollisions,
} from "../cli/commands/utilityCollisions";
import { generate } from "../core/generate";

import { compileFixtureCss, selectorTargetsClass } from "./compileFixtureCss";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whether the real Tailwind compile emits a rule for `className` with no
 * theme CSS at all, i.e. Tailwind itself owns the class.
 * @param {string} className - Candidate class
 * @returns {Promise<boolean>} `true` when a `.className` selector is emitted
 */
const tailwindOwns = async (className: string): Promise<boolean> => {
  const css = await compileFixtureCss("", [className]);
  return new RegExp(`\\.${escapeRegExp(className)}[\\s{:,>)]`).test(css);
};

const typo = {
  fontSize: "16px",
  lineHeight: "24px",
  fontWeight: 400,
  letterSpacing: "0",
};

describe("doctor typography collision lists match the real Tailwind compiler", () => {
  it.each(TAILWIND_NUMERIC_UTILITY_ROOTS.map((root) => `${root}-1`))(
    "Tailwind owns %s",
    async (className) => {
      expect(await tailwindOwns(className)).toBe(true);
    },
  );

  it.each([...TAILWIND_STATIC_UTILITY_NAMES])(
    "Tailwind owns %s",
    async (className) => {
      expect(await tailwindOwns(className)).toBe(true);
    },
  );

  it("does not own the clean names doctor accepts (negative control)", async () => {
    for (const className of ["heading-1", "body", "caption", "title-2"]) {
      expect(await tailwindOwns(className)).toBe(false);
    }
    expect(
      findUtilityCollisions({
        colors: { primary: "#000" },
        typography: { heading1: typo, body: typo, caption: typo, title2: typo },
      }),
    ).toEqual([]);
  });
});

describe("doctor scale collision lists match the real Tailwind compiler", () => {
  const owned = TAILWIND_SCALE_COLLISIONS.flatMap(
    ({ category, statics, numeric }) => [
      ...statics.map((name) => `${category.classPrefixes[0]}-${name}`),
      ...(numeric ? [`${category.classPrefixes[0]}-10`] : []),
    ],
  );

  it.each(owned)("Tailwind owns %s", async (className) => {
    expect(await tailwindOwns(className)).toBe(true);
  });

  it("does not own the clean names doctor accepts (negative control)", async () => {
    for (const className of [
      "z-modal",
      "opacity-muted",
      "duration-fast",
      "ease-standard",
      "ease-10",
    ]) {
      expect(await tailwindOwns(className)).toBe(false);
    }
    expect(
      findUtilityCollisions({
        colors: { primary: "#000" },
        zIndex: { modal: 50 },
        opacity: { muted: 0.64 },
        motionDuration: { fast: "150ms" },
        motionEasing: { standard: "ease-out", "10": "linear" },
      }),
    ).toEqual([]);
  });
});

describe("the divide-x/y color-key rejection matches the real Tailwind compiler", () => {
  it.each(["divide-x", "divide-y", "divide-x-7", "divide-y-3"])(
    "Tailwind owns %s",
    async (className) => {
      expect(await tailwindOwns(className)).toBe(true);
    },
  );
});

describe("doctor color-prefix collision lists match the real Tailwind compiler", () => {
  it.each([...TAILWIND_COLOR_STATIC_CLASSES])(
    "Tailwind owns %s",
    async (className) => {
      expect(await tailwindOwns(className)).toBe(true);
    },
  );

  it.each(TAILWIND_COLOR_NUMERIC_ROOTS.map((root) => `${root}-3`))(
    "Tailwind owns %s",
    async (className) => {
      expect(await tailwindOwns(className)).toBe(true);
    },
  );

  it("does not own divide-hidden, outline-auto, placeholder-shown, placeholder-none", async () => {
    for (const className of [
      "divide-hidden",
      "outline-auto",
      "placeholder-shown",
      "placeholder-none",
    ]) {
      expect(await tailwindOwns(className)).toBe(false);
    }
    expect(
      findUtilityCollisions({ colors: { primary: "#000", hidden: "#000" } }),
    ).toEqual([
      'colors.hidden → class "outline-hidden" collides with Tailwind\'s built-in "outline-hidden" utility',
    ]);
  });
});

/**
 * Every `border-radius` value of the rules that target `classSelector`.
 * @param {string} css - Compiled CSS
 * @param {string} classSelector - Escaped class selector, with the leading `.`
 * @returns {string[]} One value per matching declaration, in source order
 */
const radiusValues = (css: string, classSelector: string): string[] => {
  const values: string[] = [];
  postcss.parse(css).walkRules((rule) => {
    if (
      !rule.selectors.some((s) => selectorTargetsClass(s.trim(), classSelector))
    )
      return;
    rule.walkDecls("border-radius", (decl) => {
      values.push(decl.value);
    });
  });
  return values;
};

describe("borderRadius.full against Tailwind's static rounded-full", () => {
  it("the theme value wins: one rounded-full rule reads var(--sg-radius-full)", async () => {
    const { css } = generate({
      colors: { a: "#000" },
      borderRadius: { full: "9999px" },
    });
    const out = await compileFixtureCss(css, ["rounded-full"]);
    expect(radiusValues(out, ".rounded-full")).toEqual([
      "var(--sg-radius-full)",
    ]);
    expect(
      findUtilityCollisions({
        colors: { a: "#000" },
        borderRadius: { full: "9999px" },
      }),
    ).toEqual([]);
  });

  it("negative control: without borderRadius, rounded-full is Tailwind's static value", async () => {
    const { css } = generate({ colors: { a: "#000" } });
    const out = await compileFixtureCss(css, ["rounded-full"]);
    expect(radiusValues(out, ".rounded-full")).toEqual([
      "calc(infinity * 1px)",
    ]);
  });
});
