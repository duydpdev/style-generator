import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ui } from "../../tests/ui";

describe("Dialog", () => {
  it("renders nothing while closed", () => {
    expect(
      renderToStaticMarkup(
        <ui.Dialog open={false} onClose={() => undefined} />,
      ),
    ).toBe("");
  });
  it("renders the modal markup while open", () => {
    const html = renderToStaticMarkup(
      <ui.Dialog open onClose={() => undefined} />,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("backdrop-blur-md");
    expect(html).toContain("max-w-md");
  });
  it("closes on a backdrop click and on Escape, not on an inner click", () => {
    const onClose = vi.fn();
    const el = ui.Dialog({ open: true, onClose }) as ReactElement<{
      onClick: (e: { target: unknown; currentTarget: unknown }) => void;
      onKeyDown: (e: { key: string }) => void;
    }>;
    const self = {};
    el.props.onClick({ target: {}, currentTarget: self });
    expect(onClose).not.toHaveBeenCalled();
    el.props.onClick({ target: self, currentTarget: self });
    el.props.onKeyDown({ key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
