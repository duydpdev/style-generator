import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Stack } from "../stack";

import { Progress } from "./Progress";
import { progressIntents } from "./style";

const meta = {
  title: "UI/Progress",
  component: Progress,
  args: { "aria-label": "Upload", value: 40, size: "md" },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A computed `backgroundColor` of a probe that reads a theme variable directly. */
const probe = (host: HTMLElement, value: string): string => {
  const span = host.ownerDocument.createElement("span");
  span.style.display = "block";
  span.style.backgroundColor = value;
  host.append(span);
  const computed = getComputedStyle(span).backgroundColor;
  span.remove();
  return computed;
};

/** `aria-valuenow` is the value; the indicator fills that share of the track in the `color` token. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const bar = canvas.getByRole("progressbar", { name: "Upload" });
    await expect(bar).toHaveAttribute("aria-valuenow", "40");
    await expect(bar).toHaveAttribute("aria-valuemax", "100");
    const indicator = bar.firstElementChild;
    if (!(indicator instanceof HTMLElement)) throw new Error("no indicator");
    await Promise.all(indicator.getAnimations().map((a) => a.finished));
    await expect(indicator.getBoundingClientRect().width).toBeCloseTo(
      bar.getBoundingClientRect().width * 0.4,
    );
    await expect(getComputedStyle(indicator).backgroundColor).toBe(
      probe(canvasElement, "var(--sg-color-primary)"),
    );
  },
};

/** A value outside `0…max` is clamped. */
export const Clamped: Story = {
  args: { value: 150 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
  },
};

/** A `max` that is not a positive number falls back to 100, so the ARIA range stays valid. */
export const InvalidMax: Story = {
  args: { value: 50, max: 0 },
  play: async ({ canvas }) => {
    const bar = canvas.getByRole("progressbar");
    await expect(bar).toHaveAttribute("aria-valuemax", "100");
    await expect(bar).toHaveAttribute("aria-valuenow", "50");
  },
};

export const Primary: Story = { args: { color: "primary" } };
export const Secondary: Story = { args: { color: "secondary" } };
export const Success: Story = { args: { color: "success" } };
export const Danger: Story = { args: { color: "danger" } };

export const Small: Story = { args: { size: "sm" } };
export const Medium: Story = { args: { size: "md" } };
export const Large: Story = { args: { size: "lg" } };

/** The track is 4, 8 and 12 px tall. */
export const Sizes: Story = {
  render: () => (
    <Stack gap={4}>
      {(["sm", "md", "lg"] as const).map((size) => (
        <Progress key={size} size={size} value={60} aria-label={size} />
      ))}
    </Stack>
  ),
  play: async ({ canvas }) => {
    for (const [size, height] of [
      ["sm", 4],
      ["md", 8],
      ["lg", 12],
    ] as const)
      await expect(
        canvas.getByRole("progressbar", { name: size }).getBoundingClientRect()
          .height,
      ).toBe(height);
  },
};

/** One per intent. */
export const Colors: Story = {
  render: () => (
    <Stack gap={4}>
      {progressIntents.map((color) => (
        <Progress key={color} color={color} value={60} aria-label={color} />
      ))}
    </Stack>
  ),
};
