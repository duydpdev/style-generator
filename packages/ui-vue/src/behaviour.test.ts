import { describe, expect, it } from "vitest";

import { render, ui } from "../tests/ui";

describe("behaviour", () => {
  it("spacing props become sp-* classes and --sg-sp-* variables", async () => {
    const flex = await render(ui.Flex, { gap: { base: 2, md: 4 } });
    expect(flex).toContain("sp-gap");
    expect(flex).toContain("--sg-sp-gap");
    expect(await render(ui.Text, { mb: 3 })).toContain("sp-mb");
  });
  it("renders the element `as` names, with each component's default", async () => {
    expect(await render(ui.Text)).toMatch(/^<p[ >]/);
    expect(await render(ui.Text, { as: "h1" })).toMatch(/^<h1[ >]/);
    expect(await render(ui.Flex)).toMatch(/^<div[ >]/);
    expect(await render(ui.Link)).toMatch(/^<a[ >]/);
  });
  it("a number size is px, a string passes through", async () => {
    const html = await render(ui.Box, { maxWidth: 960, minHeight: "50vh" });
    expect(html).toContain("max-width:960px");
    expect(html).toContain("min-height:50vh");
  });
  it("renders no empty class or style attribute", async () => {
    const html = await render(ui.Container);
    expect(html).not.toContain('class=""');
    expect(html).not.toContain('style=""');
    expect(await render(ui.Link)).not.toContain('style=""');
  });
  it("Box innerBorder adds the hidden overlay element", async () => {
    const html = await render(ui.Box, { innerBorder: true, rounded: "lg" });
    expect(html).toContain('<span aria-hidden="true"');
    expect(html).toContain("pointer-events-none");
    expect(await render(ui.Box)).not.toContain("<span");
  });
});
