import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bare } from "../../tests/ui";

describe("Code", () => {
  it("renders a bare code element without a code preset", () => {
    expect(renderToStaticMarkup(<bare.Code>x</bare.Code>)).toBe(
      "<code>x</code>",
    );
  });
  it("renders a block as pre", () => {
    expect(renderToStaticMarkup(<bare.Code as="pre">x</bare.Code>)).toBe(
      "<pre>x</pre>",
    );
  });
});
