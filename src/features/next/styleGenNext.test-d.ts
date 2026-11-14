import { describe, it, expectTypeOf } from "vitest";

import { styleGenNext } from "./styleGenNext";

describe("styleGenNext resolved config type", () => {
  const wrap = styleGenNext();

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

  it("accepts only a root option and keeps the config type", () => {
    const config = { reactStrictMode: true };
    expectTypeOf(
      styleGenNext({ root: "app" })(config)("phase-production-build"),
    ).toEqualTypeOf<{
      reactStrictMode: boolean;
    }>();
    // @ts-expect-error `themePath` was removed in 8.0: it lives in style-gen.config.json
    styleGenNext({ themePath: "theme.json" });
  });
});
