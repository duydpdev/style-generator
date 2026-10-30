import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ui } from "../../tests/ui";

describe("Select", () => {
  it("renders the select preset", () => {
    expect(renderToStaticMarkup(<ui.Select />)).toBe(
      '<select class="rounded-md border border-current/20 bg-surface px-2 py-1"></select>',
    );
  });
});
