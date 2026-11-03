import type { ElementType } from "react";
import { describe, expectTypeOf, it } from "vitest";

import type { Polymorphic } from "./polymorphic";

type LinkProps<T extends ElementType = "a"> = Polymorphic<
  T,
  { readonly tone: "plain" | "loud" }
>;
type SizedInput = Polymorphic<
  "input",
  { readonly size?: "sm" | "lg" | undefined }
>;

describe("Polymorphic", () => {
  it("keeps the own props and adds the element's props", () => {
    expectTypeOf<LinkProps["tone"]>().toEqualTypeOf<"plain" | "loud">();
    expectTypeOf<LinkProps["href"]>().toEqualTypeOf<string | undefined>();
    expectTypeOf<LinkProps<"button">["type"]>().toEqualTypeOf<
      "submit" | "reset" | "button" | undefined
    >();
  });

  it("lets an own prop replace the element prop of the same name", () => {
    expectTypeOf<SizedInput["size"]>().toEqualTypeOf<"sm" | "lg" | undefined>();
  });

  it("types as as the rendered element", () => {
    expectTypeOf<LinkProps<"button">["as"]>().toEqualTypeOf<
      "button" | undefined
    >();
  });
});
