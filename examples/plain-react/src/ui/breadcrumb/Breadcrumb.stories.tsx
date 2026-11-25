import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Breadcrumb } from "./Breadcrumb";

const meta = {
  title: "UI/Breadcrumb",
  component: Breadcrumb,
  args: {
    items: [
      { label: "Home", href: "#home" },
      { label: "Docs", href: "#docs" },
      { label: "Components" },
    ],
  },
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A computed `color` of a probe that reads a theme variable directly. */
const probe = (host: HTMLElement, value: string): string => {
  const span = host.ownerDocument.createElement("span");
  span.style.color = value;
  host.append(span);
  const computed = getComputedStyle(span).color;
  span.remove();
  return computed;
};

/** A named `<nav>`: the earlier items are `muted` links, the last is the `foreground` current page; the separators are hidden from assistive technology. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const nav = canvas.getByRole("navigation", { name: "Breadcrumb" });
    await expect(canvas.getAllByRole("listitem")).toHaveLength(3);
    const link = canvas.getByRole("link", { name: "Home" });
    await expect(getComputedStyle(link).color).toBe(
      probe(canvasElement, "var(--sg-color-muted)"),
    );
    const current = canvas.getByText("Components");
    await expect(current).toHaveAttribute("aria-current", "page");
    await expect(getComputedStyle(current).color).toBe(
      probe(canvasElement, "var(--sg-color-foreground)"),
    );
    await expect(nav.querySelectorAll("[aria-hidden]")).toHaveLength(2);
  },
};

/** `separator` replaces the slash. */
export const Chevron: Story = {
  args: { separator: "›" },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelector("[aria-hidden]"),
    ).toHaveTextContent("›");
  },
};
