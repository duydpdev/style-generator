import { describe, expect, it, vi } from "vitest";

import { DEFAULT_SPACING_PROPERTIES } from "../../shared/defaultOption";
import type { SpacingKey } from "../../shared/defaultOption";
import { resolveSpacingProps } from "../spacing/spacingHelpers";

import { splitSpacingProps } from "./spacingProps";

const KEYS = Object.keys(DEFAULT_SPACING_PROPERTIES) as SpacingKey[];
describe("splitSpacingProps", () => {
  it("separates spacing props from arbitrary props, keeping the latter untouched", () => {
    const onClick = vi.fn();
    const { spacing, rest } = splitSpacingProps(
      { p: 4, gapX: { base: 2, md: 4 }, id: "x", onClick, "data-a": 1 },
      KEYS,
    );
    expect(spacing).toEqual({
      className: "sp-p sp-gap-x",
      style: {
        "--sg-sp-p": "1rem",
        "--sg-sp-gap-x": "0.5rem",
        "--sg-sp-gap-x-md": "1rem",
      },
    });
    expect(rest).toEqual({ id: "x", onClick, "data-a": 1 });
    expect(rest.onClick).toBe(onClick);
  });

  it("matches resolveSpacingProps for the props it resolves", () => {
    const props = { p: 4, mx: { base: 2, md: 4 }, mt: 0 } as const;
    const { spacing } = splitSpacingProps(props, KEYS);
    const expected = resolveSpacingProps(props);
    expect(spacing.className).toBe(expected.classNames);
    expect(spacing.style).toEqual(expected.style);
  });

  it("returns an empty className/style and the full props when none are set", () => {
    const props = { id: "a", title: "b" };
    const { spacing, rest } = splitSpacingProps(props, KEYS);
    expect(spacing).toEqual({ className: "", style: {} });
    expect(rest).toEqual(props);
    expect(rest).not.toBe(props);
  });

  it("drops a spacing key from rest even when its value is undefined or null, without resolving it", () => {
    const { spacing, rest } = splitSpacingProps(
      { p: undefined, mx: null, id: "a" } as never,
      KEYS,
    );
    expect(spacing).toEqual({ className: "", style: {} });
    expect(rest).toEqual({ id: "a" });
    expect(Object.keys(rest)).toEqual(["id"]);
  });

  it("resolves 0 (a falsy but valid value)", () => {
    const { spacing } = splitSpacingProps({ p: 0 }, KEYS);
    expect(spacing).toEqual({
      className: "sp-p",
      style: { "--sg-sp-p": "0rem" },
    });
  });

  it("applies the unit multiplier", () => {
    const { spacing } = splitSpacingProps({ p: 4 }, KEYS, 0.5);
    expect(spacing.style).toEqual({ "--sg-sp-p": "2rem" });
  });

  it("ignores spacing-named props that are not in keys (they stay in rest)", () => {
    const { spacing, rest } = splitSpacingProps({ p: 4, mx: 2 }, [
      "p",
    ] as const);
    expect(spacing.className).toBe("sp-p");
    expect(rest).toEqual({ mx: 2 });
  });

  it("supports custom keys, camelCasing kebab-case ones, and the order of keys decides the className order", () => {
    const { spacing, rest } = splitSpacingProps(
      { gapY: 1, inset: 2, other: true },
      ["inset", "gap-y"] as const,
    );
    expect(spacing.className).toBe("sp-inset sp-gap-y");
    expect(spacing.style).toEqual({
      "--sg-sp-inset": "0.5rem",
      "--sg-sp-gap-y": "0.25rem",
    });
    expect(rest).toEqual({ other: true });
  });

  it("does not mutate the input props", () => {
    const props = Object.freeze({ p: 4, id: "a" });
    expect(() => splitSpacingProps(props, KEYS)).not.toThrow();
    expect(props).toEqual({ p: 4, id: "a" });
  });
});
