import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Input", () => {
  it("marks an invalid input", () => {
    const html = renderToStaticMarkup(<ui.Input invalid />);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("border-danger");
  });
});
