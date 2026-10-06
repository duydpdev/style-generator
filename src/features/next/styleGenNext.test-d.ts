import { describe, it, expectTypeOf } from "vitest";

import { styleGenNext } from "./styleGenNext";

describe("styleGenNext resolved config type", () => {
  const wrap = styleGenNext({ themePath: "theme.json" });

  it("returns an object config's own type", () => {
    const config = { reactStrictMode: true };
    expectTypeOf(wrap(config)("phase-production-build")).toEqualTypeOf<{
      reactStrictMode: boolean;
    }>();
  });

  it("returns a function config's result type, whatever it annotates ctx as", () => {
    const config = (
      _phase: string,
      ctx: { defaultConfig: { poweredByHeader: boolean } },
    ) => ({ poweredByHeader: !ctx.defaultConfig.poweredByHeader });
    expectTypeOf(wrap(config)("phase-production-build")).toEqualTypeOf<{
      poweredByHeader: boolean;
    }>();
  });
});
