import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Badge", () => {
  it("renders a soft primary span by default", () => {
    const html = renderToStaticMarkup(<ui.Badge />);
    expect(html).toContain("<span");
    expect(html).toContain("bg-primary/10 text-primary");
  });
});
