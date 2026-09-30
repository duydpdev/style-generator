import { describe, expect, it } from "vitest";

import { toKebabCase } from "../shared/helpers";

import { kebabParityCases } from "./__fixtures__/kebabParityCases";

describe("toKebabCase runtime/type parity table", () => {
  it.each(kebabParityCases)("$key → $kebab", ({ key, kebab }) => {
    expect(toKebabCase(key)).toBe(kebab);
  });
});
