import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Grid", () => {
  it("emits responsive column classes and variables", () => {
    const html = renderToStaticMarkup(<ui.Grid columns={{ base: 1, md: 3 }} />);
    expect(html).toContain("grid-cols-(--ui-grid-cols)");
    expect(html).toContain("md:grid-cols-(--ui-grid-cols-md)");
    expect(html).toContain("--ui-grid-cols:repeat(1, minmax(0, 1fr))");
    expect(html).toContain("--ui-grid-cols-md:repeat(3, minmax(0, 1fr))");
  });
  it("rejects a non-positive column count", () => {
    expect(() => renderToStaticMarkup(<ui.Grid columns={0} />)).toThrow(
      RangeError,
    );
  });
});
