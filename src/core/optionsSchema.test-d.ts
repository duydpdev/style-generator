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

  it("a coverage entry is a boolean or a { prefixes, keys, opacities } rule", () => {
    expectTypeOf<NonNullable<In["coverage"]>["colors"]>().toEqualTypeOf<
      | boolean
      | {
          prefixes?: string[] | undefined;
          keys?: "aliased" | "all" | undefined;
          opacities?:
            | (
                | number
                | {
                    steps: number[];
                    prefixes?: string[] | undefined;
                    keys?: string[] | undefined;
                  }
              )[]
            | undefined;
        }
      | undefined
    >();
    expectTypeOf<CoverageRule>().toEqualTypeOf<{
      prefixes?: readonly [RegistryPrefix, ...RegistryPrefix[]];
      keys?: "aliased" | "all";
    }>();
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
    // `typography` has no `$` aliases: `keys: "aliased"` is rejected at runtime.
    expectTypeOf<{
      typography: { keys: "aliased" };
    }>().not.toExtend<Coverage>();
    expectTypeOf<{
      typography: { keys: "all" };
    }>().toExtend<Coverage>();
    expectTypeOf<{ typography: false }>().toExtend<Coverage>();
    expectTypeOf<{
      colors: { keys: "aliased"; prefixes: ["bg"] };
      shadows: { keys: "aliased" };
    }>().toExtend<Coverage>();
  });

  it("coverage prefixes are a non-empty list, like the schema's min(1)", () => {
    type Coverage = NonNullable<StyleGeneratorOptions["coverage"]>;

    expectTypeOf<{ colors: { prefixes: [] } }>().not.toExtend<Coverage>();
    expectTypeOf<{
      colors: { prefixes: readonly [] };
    }>().not.toExtend<Coverage>();
    expectTypeOf<{
      colors: { prefixes: ["bg", "text"] };
    }>().toExtend<Coverage>();
    expectTypeOf<{ colors: { keys: "aliased" } }>().toExtend<Coverage>();
  });

  it("coverage opacities are typed for colors only, as a non-empty number list", () => {
    type Coverage = NonNullable<StyleGeneratorOptions["coverage"]>;

    expectTypeOf<{ colors: { opacities: [10, 20] } }>().toExtend<Coverage>();
    expectTypeOf<{
      colors: { opacities: readonly [10] };
    }>().toExtend<Coverage>();
    expectTypeOf<{
      colors: { prefixes: ["bg"]; keys: "aliased"; opacities: [10] };
    }>().toExtend<Coverage>();
    expectTypeOf<{ colors: { opacities: [] } }>().not.toExtend<Coverage>();
    expectTypeOf<{
      colors: { opacities: ["10"] };
    }>().not.toExtend<Coverage>();
    expectTypeOf<{ shadows: { opacities: [10] } }>().not.toExtend<Coverage>();
    expectTypeOf<{
      shadows: { keys: "all"; opacities: [10] };
    }>().not.toExtend<Coverage>();
    expectTypeOf<{
      typography: { opacities: [10] };
    }>().not.toExtend<Coverage>();
    expectTypeOf<{
      borderWidth: { opacities: [10] };
    }>().not.toExtend<Coverage>();
  });

  it("an opacity group is a colors-only entry whose prefixes are colors prefixes", () => {
    type Coverage = NonNullable<StyleGeneratorOptions["coverage"]>;

    expectTypeOf<{
      colors: {
        opacities: [5, { steps: [32]; prefixes: ["bg"]; keys: ["foreground"] }];
      };
    }>().toExtend<Coverage>();
    expectTypeOf<{
      colors: { opacities: [{ steps: [32] }] };
    }>().toExtend<Coverage>();
    expectTypeOf<{
      colors: { opacities: [{ steps: [] }] };
    }>().not.toExtend<Coverage>();
    expectTypeOf<{
      colors: { opacities: [{ steps: [32]; prefixes: ["shadow"] }] };
    }>().not.toExtend<Coverage>();
    expectTypeOf<{
      colors: { opacities: [{ steps: [32]; prefixes: [] }] };
    }>().not.toExtend<Coverage>();
    expectTypeOf<{
      shadows: { opacities: [{ steps: [32] }] };
    }>().not.toExtend<Coverage>();

    const coverage: Coverage = {
      colors: {
        // @ts-expect-error `shadow` is not a class prefix of `colors`
        opacities: [{ steps: [32], prefixes: ["shadow"] }],
      },
    };
    expectTypeOf(coverage).toExtend<Coverage>();
  });
});
