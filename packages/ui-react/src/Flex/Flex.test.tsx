import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Flex", () => {
  it("defaults to a row", () => {
    expect(renderToStaticMarkup(<ui.Flex />)).toBe(
      '<div class="flex flex-row"></div>',
    );
  });
  it("is polymorphic and takes spacing", () => {
    expect(
      renderToStaticMarkup(<ui.Flex as="label" htmlFor="x" gap={2} />),
    ).toBe(
      '<label for="x" class="flex flex-row sp-gap" style="--sg-sp-gap:0.5rem"></label>',
    );
  });
});
