import type { Meta, StoryObj } from "@storybook/react";
import { expect, fireEvent, fn } from "storybook/test";

import { Stack } from "../stack";

import { Slider } from "./Slider";
import { sliderIntents } from "./style";

const meta = {
  title: "UI/Slider",
  component: Slider,
  args: {
    "aria-label": "Volume",
    min: 0,
    max: 10,
    defaultValue: 5,
    size: "md",
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A computed `<property>` of a probe that reads a theme variable directly. */
const probe = (
  host: HTMLElement,
  property: "accentColor" | "height",
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

/** A change reaches `onChange` with the new value; the accent colour is the `color` token. */
export const Default: Story = {
  args: { onChange: fn() },
  play: async ({ args, canvas, canvasElement }) => {
    const control = canvas.getByRole("slider", { name: "Volume" });
    await fireEvent.change(control, { target: { value: "7" } });
    await expect(control).toHaveValue("7");
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(getComputedStyle(control).accentColor).toBe(
      probe(canvasElement, "accentColor", "var(--sg-color-primary)"),
    );
  },
};

export const Primary: Story = { args: { color: "primary" } };
export const Secondary: Story = { args: { color: "secondary" } };
export const Success: Story = { args: { color: "success" } };
export const Danger: Story = { args: { color: "danger" } };

export const Small: Story = { args: { size: "sm" } };
export const Medium: Story = { args: { size: "md" } };
export const Large: Story = { args: { size: "lg" } };

/** Each size's hit area is its `controlHeight` token tall. */
export const Sizes: Story = {
  render: () => (
    <Stack gap={4}>
      {(["sm", "md", "lg"] as const).map((size) => (
        <Slider key={size} size={size} aria-label={size} />
      ))}
    </Stack>
  ),
  play: async ({ canvas, canvasElement }) => {
    for (const size of ["sm", "md", "lg"] as const)
      await expect(
        getComputedStyle(canvas.getByRole("slider", { name: size })).height,
      ).toBe(probe(canvasElement, "height", `var(--sg-control-${size})`));
  },
};

/** One per intent. */
export const Colors: Story = {
  render: () => (
    <Stack gap={4}>
      {sliderIntents.map((color) => (
        <Slider key={color} color={color} aria-label={color} />
      ))}
    </Stack>
  ),
};

/** `disabled` blocks the change and dims the control through the theme's `opacity.disabled`. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    const control = canvas.getByRole("slider", { name: "Volume" });
    await expect(control).toBeDisabled();
    await expect(getComputedStyle(control).opacity).toBe("0.5");
  },
};
