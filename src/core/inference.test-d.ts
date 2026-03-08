import { describe, it, expectTypeOf } from "vitest";

import { InferColorKeys, DesignTokensWeb } from "./inference";

describe("Type Inference", () => {
  it("should infer flat color keys correctly", () => {
    // Avoid intersection with ThemeConfig which has index signatures that can erase literal keys.
    // Instead, define a type that satisfies ThemeConfig but keeps literal keys.
    interface MyTheme {
      colors: {
        base: {
          primary: "#007AFF";
        };
        text: {
          main: "#000000";
        };
        common: {
          white: "#FFFFFF";
        };
      };
      typography: {
        body: {
          fontSize: "16px";
          lineHeight: "24px";
          fontWeight: 400;
          letterSpacing: "0";
        };
      };
    }

    // Verify it extends ThemeConfig
    // expectTypeOf<MyTheme>().toMatchTypeOf<ThemeConfig>();

    expectTypeOf<InferColorKeys<MyTheme>>().toEqualTypeOf<
      "primary" | "main" | "white"
    >();
  });

  it("should infer nested color keys and handle DEFAULT", () => {
    interface MyTheme {
      colors: {
        base: {
          blue: {
            "500": "#007AFF";
            "600": "#0062CC";
          };
        };
        text: {
          muted: {
            DEFAULT: "#666666";
            dark: "#333333";
          };
        };
        common: {
          shadcn: {
            DEFAULT: "#000000";
            foreground: "#FFFFFF";
          };
        };
      };
      typography: {
        body: {
          fontSize: "16px";
          lineHeight: "24px";
          fontWeight: 400;
          letterSpacing: "0";
        };
      };
    }

    expectTypeOf<InferColorKeys<MyTheme>>().toEqualTypeOf<
      | "blue500"
      | "blue600"
      | "muted"
      | "mutedDark"
      | "shadcn"
      | "shadcnForeground"
    >();
  });

  it("should infer DesignTokensWeb fields accurately", () => {
    interface MyTheme {
      colors: {
        base: { primary: "#007" };
        text: {
          muted: {
            DEFAULT: "#666";
            dark: "#333";
          };
        };
        common: {
          white: "#FFF";
        };
      };
      typography: {
        h1: {
          fontSize: "32px";
          lineHeight: "40px";
          fontWeight: 700;
          letterSpacing: "0";
        };
      };
    }

    type Web = DesignTokensWeb<MyTheme>;

    expectTypeOf<Web["variantText"]>().toEqualTypeOf<"h1"[]>();
    expectTypeOf<Web["variantTextColor"]>().toEqualTypeOf<
      ("muted" | "mutedDark")[]
    >();
    expectTypeOf<Web["variantCommonColor"]>().toEqualTypeOf<"white"[]>();
    expectTypeOf<Web["variantColor"]>().toEqualTypeOf<
      ("primary" | "muted" | "mutedDark" | "white")[]
    >();

    // @ts-expect-error - variantBaseColor is not exposed on DesignTokensWeb
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    type _ = Web["variantBaseColor"];
  });

  it("should handle theme with only base colors", () => {
    interface MyTheme {
      colors: {
        base: {
          primary: "#007";
          secondary: {
            DEFAULT: "#555";
            light: "#999";
          };
        };
      };
      typography: {
        body: {
          fontSize: "16px";
          lineHeight: "24px";
          fontWeight: 400;
          letterSpacing: "0";
        };
      };
    }

    type Web = DesignTokensWeb<MyTheme>;

    expectTypeOf<Web["variantColor"]>().toEqualTypeOf<
      ("primary" | "secondary" | "secondaryLight")[]
    >();
    expectTypeOf<Web["variantTextColor"]>().toEqualTypeOf<never[]>();
    expectTypeOf<Web["variantCommonColor"]>().toEqualTypeOf<never[]>();
  });
});
