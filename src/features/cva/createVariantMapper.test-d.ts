import { describe, it, expectTypeOf } from "vitest";

import { createVariantMapper } from "./createVariantMapper";

describe("createVariantMapper return type", () => {
  const colors = ["primary", "primaryForeground", "blue500"] as const;

  it("each key maps to its OWN literal class (not the union)", () => {
    const map = createVariantMapper("bg", colors);

    expectTypeOf(map.primary).toEqualTypeOf<"bg-primary">();
    expectTypeOf(
      map.primaryForeground,
    ).toEqualTypeOf<"bg-primary-foreground">();
    expectTypeOf(map.blue500).toEqualTypeOf<"bg-blue-500">();
  });

  it("supports empty prefix — value is plain kebab-case key", () => {
    const map = createVariantMapper("", colors);

    expectTypeOf(map.primary).toEqualTypeOf<"primary">();
    expectTypeOf(map.primaryForeground).toEqualTypeOf<"primary-foreground">();
    expectTypeOf(map.blue500).toEqualTypeOf<"blue-500">();
  });

  it("works with text-/border- prefixes", () => {
    const text = createVariantMapper("text", ["sidebarForeground"] as const);
    const border = createVariantMapper("border", ["blue500"] as const);

    expectTypeOf(
      text.sidebarForeground,
    ).toEqualTypeOf<"text-sidebar-foreground">();
    expectTypeOf(border.blue500).toEqualTypeOf<"border-blue-500">();
  });

  it("preserves digit-prefix tokens like 2xl unchanged", () => {
    const r = createVariantMapper("rounded", ["2xl", "sm"] as const);
    expectTypeOf(r["2xl"]).toEqualTypeOf<"rounded-2xl">();
    expectTypeOf(r.sm).toEqualTypeOf<"rounded-sm">();
  });

  it("supports the prefixes-array overload — nested per-prefix maps", () => {
    const map = createVariantMapper(
      ["bg", "text"] as const,
      ["primary"] as const,
    );

    expectTypeOf(map.bg.primary).toEqualTypeOf<"bg-primary">();
    expectTypeOf(map.text.primary).toEqualTypeOf<"text-primary">();
  });

  it("kebab-cases digit-boundary typography tokens with the empty prefix", () => {
    const map = createVariantMapper("", ["text12Mono"] as const);
    expectTypeOf(map.text12Mono).toEqualTypeOf<"text-12-mono">();
  });

  it("{ states } overload returns a plain Record<T, string> (widened, not per-key literal)", () => {
    const tokens = ["primary", "primaryHover", "primaryActive"] as const;
    const map = createVariantMapper("bg", tokens, {
      states: ["hover", "active"],
    });

    expectTypeOf(map).toEqualTypeOf<Record<(typeof tokens)[number], string>>();
  });

  it("{ states } + prefixes-array overload returns Record<P, Record<T, string>>", () => {
    const tokens = ["primary", "primaryHover"] as const;
    const map = createVariantMapper(["bg", "text"] as const, tokens, {
      states: ["hover"],
    });

    expectTypeOf(map).toEqualTypeOf<
      Record<"bg" | "text", Record<(typeof tokens)[number], string>>
    >();
  });
});
