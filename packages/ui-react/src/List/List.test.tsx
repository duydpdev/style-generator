import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ui } from "../../tests/ui";

describe("List and ListItem", () => {
  it("renders a list with its marker", () => {
    expect(renderToStaticMarkup(<ui.List marker="none" />)).toBe(
      '<ul class="list-none"></ul>',
    );
  });
  it("reads `position` as the list-style position, not the box position", () => {
    expect(renderToStaticMarkup(<ui.List position="inside" />)).toBe(
      '<ul class="list-inside"></ul>',
    );
  });
  it("renders a list item with spacing props", () => {
    expect(renderToStaticMarkup(<ui.ListItem p={2} />)).toContain(
      '<li class="sp-p"',
    );
  });
});
