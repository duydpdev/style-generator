import { describe, it, expectTypeOf } from "vitest";

import { COLOR_STATES } from "../../shared/colorStates";
import type { RegistryPrefix } from "../registry/builtInCategories";

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

  describe("{ states } overloads", () => {
    const tokens = [
      "primary",
      "primaryHover",
      "primaryActive",
      "danger",
    ] as const;

    it("returns the literal chained class string per token", () => {
      const map = createVariantMapper("bg", tokens, {
        states: ["hover", "active"],
      });

      expectTypeOf(
        map.primary,
      ).toEqualTypeOf<"bg-primary hover:bg-primary-hover active:bg-primary-active">();
      expectTypeOf(map.primaryHover).toEqualTypeOf<"bg-primary-hover">();
      expectTypeOf(map.primaryActive).toEqualTypeOf<"bg-primary-active">();
      expectTypeOf(map.danger).toEqualTypeOf<"bg-danger">();
    });

    it("accepts COLOR_STATES straight through", () => {
      const map = createVariantMapper("text", tokens, { states: COLOR_STATES });

      expectTypeOf(
        map.primary,
      ).toEqualTypeOf<"text-primary hover:text-primary-hover active:text-primary-active">();
    });

    it("only chains the states that have a sibling, in declared state order", () => {
      const map = createVariantMapper(
        "bg",
        ["primary", "primaryActive"] as const,
        { states: ["hover", "active"] },
      );

      expectTypeOf(
        map.primary,
      ).toEqualTypeOf<"bg-primary active:bg-primary-active">();
    });

    it("pascal-cases a camelCase or kebab-case state to find the sibling, kebab-cases the variant", () => {
      const camel = createVariantMapper(
        "bg",
        ["primary", "primaryFocusVisible"] as const,
        { states: ["focusVisible"] },
      );
      const kebab = createVariantMapper(
        "bg",
        ["primary", "primaryFocusVisible"] as const,
        { states: ["focus-visible"] },
      );

      expectTypeOf(
        camel.primary,
      ).toEqualTypeOf<"bg-primary focus-visible:bg-primary-focus-visible">();
      expectTypeOf(
        kebab.primary,
      ).toEqualTypeOf<"bg-primary focus-visible:bg-primary-focus-visible">();
    });

    it('supports the "" prefix (bare class)', () => {
      const map = createVariantMapper("", ["text12", "text12Hover"] as const, {
        states: ["hover"],
      });

      expectTypeOf(map.text12).toEqualTypeOf<"text-12 hover:text-12-hover">();
    });

    it("multi-prefix form maps each prefix to its own StateVariantMap", () => {
      const map = createVariantMapper(["bg", "text"] as const, tokens, {
        states: ["hover"],
      });

      expectTypeOf(
        map.bg.primary,
      ).toEqualTypeOf<"bg-primary hover:bg-primary-hover">();
      expectTypeOf(
        map.text.primary,
      ).toEqualTypeOf<"text-primary hover:text-primary-hover">();
      expectTypeOf(map.text.danger).toEqualTypeOf<"text-danger">();
    });

    it("falls back to string when states is typed readonly string[]", () => {
      const states: readonly string[] = ["hover"];
      const map = createVariantMapper("bg", tokens, { states });

      expectTypeOf(map.primary).toEqualTypeOf<string>();
      expectTypeOf(map.danger).toEqualTypeOf<string>();
    });

    it("falls back to string for non-literal tokens", () => {
      const wide: readonly string[] = ["primary"];
      const map = createVariantMapper("bg", wide, { states: ["hover"] });

      expectTypeOf(map).toEqualTypeOf<Readonly<Record<string, string>>>();
    });

    it("rejects an unregistered prefix", () => {
      expectTypeOf<"ring">().not.toExtend<RegistryPrefix | "">();
      // @ts-expect-error "ring" is not a prefix any registry category feeds
      createVariantMapper("ring", tokens, { states: ["hover"] });
    });
  });

  describe("prefix constraint", () => {
    it("rejects an unregistered prefix (single and multi)", () => {
      expectTypeOf<"ring">().not.toExtend<RegistryPrefix | "">();
      // @ts-expect-error "ring" is not a registered class prefix
      createVariantMapper("ring", colors);
      // @ts-expect-error "ring" is not a registered class prefix
      createVariantMapper(["bg", "ring"] as const, colors);
    });

    it("allowUnregisteredPrefix opts out and keeps the literal class", () => {
      const map = createVariantMapper("ring", colors, {
        allowUnregisteredPrefix: true,
      });

      expectTypeOf(map.primary).toEqualTypeOf<"ring-primary">();
      expectTypeOf(map.blue500).toEqualTypeOf<"ring-blue-500">();
    });
  });
});
