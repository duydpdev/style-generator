import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Button } from "../button";
import { Stack } from "../stack";

import { TooltipContent } from "./Tooltip";

const meta = {
  title: "UI/Tooltip",
  component: TooltipContent,
  args: { id: "copy-tip", children: "Copy to clipboard" },
  render: (args) => (
    <Stack gap={2} align="start">
      <Button variant="outline" aria-describedby={args.id}>
        Copy
      </Button>
      <TooltipContent {...args} />
    </Stack>
  ),
} satisfies Meta<typeof TooltipContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A computed style property of a probe that reads a theme variable directly. */
const probe = (
  host: HTMLElement,
  property: "backgroundColor" | "color",
  value: string,
): string => {
  const span = host.ownerDocument.createElement("span");
  span.style[property] = value;
  host.append(span);
  const computed = getComputedStyle(span)[property];
  span.remove();
  return computed;
};

/** It describes its trigger; the fill and text are `foreground` and `background`, inverted in both themes. It takes the pointer, so the app can keep it open while the pointer moves onto it (WCAG 1.4.13). */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(
      canvas.getByRole("button", { name: "Copy" }),
    ).toHaveAccessibleDescription("Copy to clipboard");
    const style = getComputedStyle(canvas.getByRole("tooltip"));
    await expect(style.backgroundColor).toBe(
      probe(canvasElement, "backgroundColor", "var(--sg-color-foreground)"),
    );
    await expect(style.color).toBe(
      probe(canvasElement, "color", "var(--sg-color-background)"),
    );
    await expect(style.pointerEvents).toBe("auto");
  },
};
