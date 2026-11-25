import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Flex } from "../flex";

import { Spinner } from "./Spinner";
import { spinnerIntents } from "./style";

const meta = {
  title: "UI/Spinner",
  component: Spinner,
  args: { size: "md" },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A computed `<property>` of a probe that reads a theme variable directly. */
const probe = (
  host: HTMLElement,
  property: "color" | "width",
  value: string,
): string => {
  const span = host.ownerDocument.createElement("span");
  span.style.display = "block";
  span.style[property] = value;
  host.append(span);
  const computed = getComputedStyle(span)[property];
  span.remove();
  return computed;
};

/** A status named "Loading" that spins, its ring in the `color` token. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const spinner = canvas.getByRole("status", { name: "Loading" });
    await expect(spinner.getAnimations()).not.toHaveLength(0);
    await expect(getComputedStyle(spinner).borderTopColor).toBe(
      probe(canvasElement, "color", "var(--sg-color-primary)"),
    );
  },
};

/** `label` renames the status. */
export const Label: Story = {
  args: { label: "Saving" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status", { name: "Saving" })).toBeVisible();
  },
};

export const Primary: Story = { args: { color: "primary" } };
export const Secondary: Story = { args: { color: "secondary" } };
export const Success: Story = { args: { color: "success" } };
export const Danger: Story = { args: { color: "danger" } };

export const Small: Story = { args: { size: "sm" } };
export const Medium: Story = { args: { size: "md" } };
export const Large: Story = { args: { size: "lg" } };

/** Each size is its `iconSize` token wide. */
export const Sizes: Story = {
  render: () => (
    <Flex gap={4} align="center">
      {(["sm", "md", "lg"] as const).map((size) => (
        <Spinner key={size} size={size} label={size} />
      ))}
    </Flex>
  ),
  play: async ({ canvas, canvasElement }) => {
    for (const size of ["sm", "md", "lg"] as const)
      await expect(
        canvas.getByRole("status", { name: size }).getBoundingClientRect()
          .width,
      ).toBe(
        Number.parseFloat(
          probe(canvasElement, "width", `var(--sg-icon-${size})`),
        ),
      );
  },
};

/** One per intent. */
export const Colors: Story = {
  render: () => (
    <Flex gap={4} align="center">
      {spinnerIntents.map((color) => (
        <Spinner key={color} color={color} label={color} />
      ))}
    </Flex>
  ),
};
