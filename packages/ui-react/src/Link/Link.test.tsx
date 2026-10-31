import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Link", () => {
  it("renders an anchor with the colour class", () => {
    expect(
      renderToStaticMarkup(<ui.Link href="/x" color="primary" />),
    ).toContain('<a href="/x" class="text-primary"');
  });
  it("takes spacing props and an underline mode", () => {
    const html = renderToStaticMarkup(
      <ui.Link href="/x" underline="hover" mt={2} />,
    );
    expect(html).toContain("no-underline hover:underline");
    expect(html).toContain("--sg-sp-mt:0.5rem");
  });
});
