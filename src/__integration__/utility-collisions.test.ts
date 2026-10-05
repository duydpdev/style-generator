import { describe, expect, it } from "vitest";

import {
  TAILWIND_NUMERIC_UTILITY_ROOTS,
  TAILWIND_STATIC_UTILITY_NAMES,
  findUtilityCollisions,
} from "../cli/commands/utilityCollisions";

import { compileFixtureCss } from "./compileFixtureCss";

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
