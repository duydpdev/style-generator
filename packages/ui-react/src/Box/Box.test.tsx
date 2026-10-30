import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bare, ui } from "../../tests/ui";

describe("Box", () => {
  it("renders the box preset base", () => {
    expect(renderToStaticMarkup(<ui.Box />)).toBe(
      '<div class="relative"></div>',
    );
  });
  it("renders nothing extra without a box preset", () => {
    expect(renderToStaticMarkup(<bare.Box />)).toBe("<div></div>");
  });
  it("maps token props and spacing props", () => {
    expect(
      renderToStaticMarkup(<ui.Box backgroundColor="surface" p={4} />),
    ).toBe(
      '<div class="relative bg-surface sp-p" style="--sg-sp-p:1rem"></div>',
    );
  });
  it("is polymorphic and takes a max width", () => {
    const html = renderToStaticMarkup(<ui.Box as="section" maxWidth={960} />);
    expect(html).toContain("<section");
    expect(html).toContain("max-width:960px");
  });
  it("draws an inner border", () => {
    const html = renderToStaticMarkup(<ui.Box innerBorder border="thin" />);
    expect(html).toContain("!border-none");
    expect(html).toContain("pointer-events-none absolute inset-0");
  });
});
