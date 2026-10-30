import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Container", () => {
  it("centres itself and caps the width", () => {
    expect(renderToStaticMarkup(<ui.Container maxWidth={960} />)).toBe(
      '<div class="mx-auto w-full" style="max-width:960px"></div>',
    );
  });
});
