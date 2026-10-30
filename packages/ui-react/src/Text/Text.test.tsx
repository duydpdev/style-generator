import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { bare, ui } from "../../tests/ui";

describe("Text", () => {
  it("renders the text preset", () => {
    expect(renderToStaticMarkup(<ui.Text>hi</ui.Text>)).toBe(
      '<p class="wrap-anywhere whitespace-pre-wrap text-16-medium text-foreground">hi</p>',
    );
  });
  it("renders a bare paragraph without a text preset", () => {
    expect(renderToStaticMarkup(<bare.Text>hi</bare.Text>)).toBe("<p>hi</p>");
  });
  it("is polymorphic and takes a typography key", () => {
    const html = renderToStaticMarkup(
      <ui.Text as="h1" type="display56Serif" />,
    );
    expect(html).toContain("<h1");
    expect(html).toContain("display-56-serif");
  });
  it("takes spacing props", () => {
    expect(renderToStaticMarkup(<bare.Text mb={2}>x</bare.Text>)).toBe(
      '<p class="sp-mb" style="--sg-sp-mb:0.5rem">x</p>',
    );
  });
});
