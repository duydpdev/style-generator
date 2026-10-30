import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { layoutOnly, ui } from "../../tests/ui";

describe("Button", () => {
  it("renders a typed button with the intent classes", () => {
    const html = renderToStaticMarkup(<ui.Button>Go</ui.Button>);
    expect(html).toContain('type="button"');
    expect(html).toContain('data-slot="button"');
    expect(html).toContain(
      "bg-primary hover:bg-primary-hover active:bg-primary-active",
    );
    expect(html).toContain("<span>Go</span>");
  });
  it("sets no button type when rendered as another element", () => {
    expect(
      renderToStaticMarkup(
        <ui.Button as="a" href="/x">
          Go
        </ui.Button>,
      ),
    ).not.toContain("type=");
  });
  it("uses the preset's own state classes for secondary", () => {
    expect(renderToStaticMarkup(<ui.Button color="secondary" />)).toContain(
      "hover:opacity-90",
    );
  });
  it("takes spacing props", () => {
    const html = renderToStaticMarkup(<ui.Button mt={4} />);
    expect(html).toContain("sp-mt");
    expect(html).toContain("--sg-sp-mt:1rem");
  });
  it("exposes only the roles the presets declare", () => {
    expect(Object.keys(layoutOnly).sort((a, b) => a.localeCompare(b))).toEqual([
      "Box",
      "Code",
      "Container",
      "Flex",
      "Grid",
      "Link",
      "List",
      "ListItem",
      "Stack",
      "Text",
    ]);
    expect(Object.keys(ui)).toHaveLength(16);
  });
});
