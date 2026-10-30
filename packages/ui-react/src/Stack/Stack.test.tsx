import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Stack", () => {
  it("defaults to a column", () => {
    expect(renderToStaticMarkup(<ui.Stack />)).toBe(
      '<div class="flex flex-col"></div>',
    );
  });
});
