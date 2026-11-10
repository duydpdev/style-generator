import "../../src/index.css";

import type { ComponentType, ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";

import { Button } from "../../src/ui/button/Button";

import { HarnessButton } from "./harness";

// An inline-level icon (FontAwesome's `.svg-inline--fa`, `<iconify-icon>`, any
// wrapping span) sits on the text baseline unless its slot centres it; a raw
// <svg> hides the bug because Tailwind's preflight makes svg a block.
const icon = (): ReactNode => (
  <span data-testid="icon" style={{ display: "inline-block" }}>
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect width="16" height="16" />
    </svg>
  </span>
);

type AnyButton = ComponentType<Record<string, unknown>>;

const buttons: [string, AnyButton][] = [
  ["plain", Button as unknown as AnyButton],
  ["harness", HarnessButton as unknown as AnyButton],
];

const centre = (r: DOMRect): { x: number; y: number } => ({
  x: r.left + r.width / 2,
  y: r.top + r.height / 2,
});

const measure = (
  root: HTMLElement,
): {
  dx: number;
  dy: number;
  children: number;
  width: number;
  height: number;
} => {
  const button = root.querySelector("button");
  const svg = root.querySelector("[data-testid=icon] svg");
  if (!button || !svg) throw new Error("button or icon not rendered");
  const box = button.getBoundingClientRect();
  const b = centre(box);
  const i = centre(svg.getBoundingClientRect());
  return {
    dx: i.x - b.x,
    dy: i.y - b.y,
    children: button.children.length,
    width: box.width,
    height: box.height,
  };
};

describe.each(buttons)("%s Button icon slots", (_name, Comp) => {
  test.each(["sm", "md", "lg"] as const)(
    "a prefix icon is vertically centred (%s)",
    async (size) => {
      const { container } = await render(
        <Comp size={size} prefix={icon()}>
          Go
        </Comp>,
      );
      expect(Math.abs(measure(container).dy)).toBeLessThanOrEqual(0.5);
    },
  );

  test("a suffix icon is vertically centred", async () => {
    const { container } = await render(<Comp suffix={icon()}>Go</Comp>);
    expect(Math.abs(measure(container).dy)).toBeLessThanOrEqual(0.5);
  });

  test.each(["sm", "md", "lg"] as const)(
    "an icon-only button is square and centres its icon (%s)",
    async (size) => {
      const { container } = await render(
        <Comp size={size} aria-label="Close" prefix={icon()} />,
      );
      const m = measure(container);
      expect(m.children).toBe(1);
      expect(Math.abs(m.width - m.height)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(m.dx)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(m.dy)).toBeLessThanOrEqual(0.5);
    },
  );

  test("a suffix-only button is square too", async () => {
    const { container } = await render(
      <Comp aria-label="Next" suffix={icon()} />,
    );
    const m = measure(container);
    expect(Math.abs(m.width - m.height)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(m.dx)).toBeLessThanOrEqual(0.5);
  });

  test("a false or empty label counts as no label", async () => {
    for (const label of [false, ""]) {
      const { container, unmount } = await render(
        <Comp aria-label="Close" prefix={icon()}>
          {label}
        </Comp>,
      );
      const m = measure(container);
      expect(m.children).toBe(1);
      expect(Math.abs(m.width - m.height)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(m.dx)).toBeLessThanOrEqual(0.5);
      await unmount();
    }
  });

  // Composite empty labels render nothing, so React must agree with Vue's
  // `filled()`: the span is dropped and the button is square.
  const emptyLabels: [string, ReactNode][] = [
    ["an empty fragment", <></>],
    ["an empty array", []],
    ["only false/null entries", [false, null]],
    ["a fragment of empty entries", <>{false}</>],
    ["blank text", "   "],
  ];
  test.each(emptyLabels)("%s counts as no label", async (_label, label) => {
    const { container } = await render(
      <Comp aria-label="Close" prefix={icon()}>
        {label}
      </Comp>,
    );
    const m = measure(container);
    expect(m.children).toBe(1);
    expect(Math.abs(m.width - m.height)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(m.dx)).toBeLessThanOrEqual(0.5);
  });

  test("a fragment holding a label still counts as a label", async () => {
    const { container } = await render(
      <Comp prefix={icon()}>
        <>{false}Go</>
      </Comp>,
    );
    const m = measure(container);
    expect(m.children).toBe(2);
    expect(m.width).toBeGreaterThan(m.height);
  });

  test("prefix and suffix without a label are not icon-only", async () => {
    const { container } = await render(
      <Comp aria-label="Both" prefix={icon()} suffix={icon()} />,
    );
    const button = container.querySelector("button");
    if (!button) throw new Error("button not rendered");
    expect(button.children).toHaveLength(2);
    const box = button.getBoundingClientRect();
    expect(box.width).toBeGreaterThan(box.height);
  });

  test("the px spacing prop still widens an icon-only button", async () => {
    const { container } = await render(
      <Comp aria-label="Close" prefix={icon()} px={4} />,
    );
    const m = measure(container);
    expect(m.width).toBeGreaterThan(m.height);
    expect(Math.abs(m.dx)).toBeLessThanOrEqual(0.5);
  });
});
