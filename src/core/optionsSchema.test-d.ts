import { describe, it, expectTypeOf } from "vitest";
import type { z } from "zod";

import type {
  CategoryKey,
  RegistryPrefix,
} from "../features/registry/builtInCategories";

import type { CoverageRule, StyleGeneratorOptions } from "./Options";
import type { StyleGeneratorOptionsSchema } from "./optionsSchema";

type In = z.input<typeof StyleGeneratorOptionsSchema>;

describe("StyleGeneratorOptionsSchema mirrors StyleGeneratorOptions", () => {
  it("accepts exactly the keys the public type declares", () => {
    expectTypeOf<keyof StyleGeneratorOptions>().toEqualTypeOf<keyof In>();
    expectTypeOf<
      keyof NonNullable<StyleGeneratorOptions["spacing"]>
    >().toEqualTypeOf<keyof NonNullable<In["spacing"]>>();
    expectTypeOf<
      keyof NonNullable<StyleGeneratorOptions["typography"]>
    >().toEqualTypeOf<keyof NonNullable<In["typography"]>>();
  });

  it("the coverage schema's category keys are exactly the registry's CategoryKey", () => {
    expectTypeOf<
      keyof NonNullable<In["coverage"]>
    >().toEqualTypeOf<CategoryKey>();
    expectTypeOf<
      keyof NonNullable<StyleGeneratorOptions["coverage"]>
    >().toEqualTypeOf<CategoryKey>();
  });

  it("a coverage entry is a boolean or a { prefixes, keys } rule", () => {
    expectTypeOf<NonNullable<In["coverage"]>["colors"]>().toEqualTypeOf<
      | boolean
      | {
          prefixes?: string[] | undefined;
          keys?: "aliased" | "all" | undefined;
        }
      | undefined
    >();
    expectTypeOf<CoverageRule>().toEqualTypeOf<{
      prefixes?: readonly RegistryPrefix[];
      keys?: "aliased" | "all";
    }>();
  });

  it("axes is { attribute?: map, scope?: 'root' | 'element' } on both sides", () => {
    expectTypeOf<
      keyof NonNullable<StyleGeneratorOptions["axes"]>
    >().toEqualTypeOf<keyof NonNullable<In["axes"]>>();
    expectTypeOf<
      NonNullable<StyleGeneratorOptions["axes"]>["scope"]
    >().toEqualTypeOf<"root" | "element" | undefined>();
    expectTypeOf<NonNullable<In["axes"]>["scope"]>().toEqualTypeOf<
      "root" | "element" | undefined
    >();
    expectTypeOf<{
      attribute: { theme: "data-mode" };
      scope: "element";
    }>().toExtend<NonNullable<StyleGeneratorOptions["axes"]>>();
    // A function is not a valid `attribute`: the option must be expressible
    // in `style-gen.config.json`.
    expectTypeOf<{
      attribute: (axis: string) => string;
    }>().not.toExtend<NonNullable<StyleGeneratorOptions["axes"]>>();
  });

  it("resetTailwindDefaults is a list of the literal namespaces on both sides", () => {
    expectTypeOf<
      NonNullable<StyleGeneratorOptions["resetTailwindDefaults"]>[number]
    >().toEqualTypeOf<"colors" | "radius" | "shadow">();
    expectTypeOf<
      NonNullable<In["resetTailwindDefaults"]>[number]
    >().toEqualTypeOf<"colors" | "radius" | "shadow">();
    expectTypeOf<{
      resetTailwindDefaults: ["colors", "radius"];
    }>().toExtend<StyleGeneratorOptions>();
    expectTypeOf<{
      resetTailwindDefaults: ["fonts"];
    }>().not.toExtend<StyleGeneratorOptions>();
  });

  it("coverage prefixes are typed per category", () => {
    type Coverage = NonNullable<StyleGeneratorOptions["coverage"]>;

    expectTypeOf<{ colors: { prefixes: ["bg"] } }>().toExtend<Coverage>();
    expectTypeOf<{
      colors: { prefixes: readonly ["bg", "text"] };
    }>().toExtend<Coverage>();
    expectTypeOf<{
      borderRadius: { prefixes: ["rounded-t"] };
    }>().toExtend<Coverage>();
    expectTypeOf<{
      colors: { prefixes: ["rounded"] };
    }>().not.toExtend<Coverage>();
    expectTypeOf<{
      shadows: { prefixes: ["bg"] };
    }>().not.toExtend<Coverage>();
    expectTypeOf<{
      typography: { prefixes: ["bg"] };
    }>().not.toExtend<Coverage>();
    expectTypeOf<{
      typography: { keys: "aliased" };
    }>().toExtend<Coverage>();
  });
});
