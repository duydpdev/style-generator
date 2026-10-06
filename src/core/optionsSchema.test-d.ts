import { describe, it, expectTypeOf } from "vitest";
import type { z } from "zod";

import type { StyleGeneratorOptions } from "./Options";
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
});
