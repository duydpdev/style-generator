import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Card", () => {
  it("renders the default tone and padding", () => {
    const html = renderToStaticMarkup(<ui.Card />);
    expect(html).toContain("bg-surface");
    expect(html).toContain("p-5");
  });
  it("takes spacing props", () => {
    expect(renderToStaticMarkup(<ui.Card px={6} />)).toContain("sp-px");
  });
});
