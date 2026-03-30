import { describe, it, expectTypeOf } from "vitest";

import { InferColorKeys, DesignTokensWeb } from "./inference";

describe("Type Inference", () => {
  it("should infer flat color keys correctly", () => {
    interface MyTheme {
      colors: {
        primary: "#007AFF";
        main: "#000000";
        white: "#FFFFFF";
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
      "primary" | "main" | "white"
    >();
  });

  it("should infer nested color keys and handle DEFAULT", () => {
    interface MyTheme {
      colors: {
        blue: {
          "500": "#007AFF";
          "600": "#0062CC";
        };
        muted: {
          DEFAULT: "#666666";
          dark: "#333333";
        };
        shadcn: {
          DEFAULT: "#000000";
          foreground: "#FFFFFF";
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
        primary: "#007";
        muted: {
          DEFAULT: "#666";
          dark: "#333";
        };
        white: "#FFF";
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
    expectTypeOf<Web["variantColor"]>().toEqualTypeOf<
      ("primary" | "muted" | "mutedDark" | "white")[]
    >();
  });

  it("should handle theme with nested colors", () => {
    interface MyTheme {
      colors: {
        primary: "#007";
        secondary: {
          DEFAULT: "#555";
          light: "#999";
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
  });
});
