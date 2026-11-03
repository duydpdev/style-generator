import type { CSSProperties } from "react";
import { describe, expectTypeOf, it } from "vitest";

import { mergeStyle, type StyleRecord, type ThemeSpacingProps } from "./layout";

interface W {
  readonly colors: readonly ("primary" | "onPrimary")[];
  readonly typography: readonly "body"[];
  readonly shadows: readonly "card"[];
  readonly backDropBlurs: readonly "glass"[];
  readonly borderRadius: readonly "pill"[];
  readonly borderWidth: readonly "thin"[];
  readonly spacingProperties: readonly ("p" | "gap-x")[];
  readonly breakpoints: readonly "md"[];
}

declare const css: CSSProperties | undefined;
declare const record: StyleRecord;

describe("ThemeSpacingProps / mergeStyle", () => {
  it("types mergeStyle by the style type of its parts", () => {
    expectTypeOf(mergeStyle(record)).toEqualTypeOf<StyleRecord | undefined>();
    expectTypeOf(mergeStyle(record, css)).toEqualTypeOf<
      CSSProperties | undefined
    >();
  });

  it("types spacing props from spacingProperties and breakpoints", () => {
    expectTypeOf<keyof ThemeSpacingProps<W>>().toEqualTypeOf<"p" | "gapX">();
    expectTypeOf<{ gapX: { base: 2; md: 4 } }>().toExtend<
      ThemeSpacingProps<W>
    >();
    expectTypeOf<{ gapX: { lg: 4 } }>().not.toExtend<ThemeSpacingProps<W>>();
  });
});
