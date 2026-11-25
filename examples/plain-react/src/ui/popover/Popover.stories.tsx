import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Text } from "../text";

import { PopoverContent } from "./Popover";

const meta = {
  title: "UI/Popover",
  component: PopoverContent,
  args: {
    "aria-label": "Share",
    children: <Text>Anyone with the link can view this board.</Text>,
  },
} satisfies Meta<typeof PopoverContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A computed style property of a probe that reads a theme variable directly. */
const probe = (
  host: HTMLElement,
  property: "backgroundColor" | "borderTopLeftRadius" | "zIndex",
  value: string,
): string => {
  const span = host.ownerDocument.createElement("span");
  span.style[property] = value;
  host.append(span);
  const computed = getComputedStyle(span)[property];
  span.remove();
  return computed;
};

/** A non-modal `role="dialog"` panel on `surface` with the `md` radius, on the `modal` layer, the panel's layer, so one opened from a dialog stacks above it when rendered after it. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const panel = canvas.getByRole("dialog", { name: "Share" });
    await expect(panel).not.toHaveAttribute("aria-modal");
    const style = getComputedStyle(panel);
    await expect(style.backgroundColor).toBe(
      probe(canvasElement, "backgroundColor", "var(--sg-color-surface)"),
    );
    await expect(style.borderTopLeftRadius).toBe(
      probe(canvasElement, "borderTopLeftRadius", "var(--sg-radius-md)"),
    );
    await expect(style.zIndex).toBe(
      probe(canvasElement, "zIndex", "var(--sg-z-modal)"),
    );
  },
};

/** `role` names another pattern the app builds on the same panel. */
export const CustomRole: Story = {
  args: { role: "region" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("region", { name: "Share" }),
    ).toBeInTheDocument();
  },
};
