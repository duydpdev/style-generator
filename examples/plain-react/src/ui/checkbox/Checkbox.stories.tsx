import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent } from "storybook/test";

import { Flex } from "../flex";

import { Checkbox } from "./Checkbox";
import { checkboxIntents } from "./style";

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  args: { children: "Remember me", size: "md" },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A computed `<property>` of a probe that reads a theme variable directly. */
const probe = (
  host: HTMLElement,
  property: "accentColor" | "width",
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

/** Clicking the label checks the checkbox; its accent colour is the `color` token. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const control = canvas.getByRole("checkbox", { name: "Remember me" });
    await userEvent.click(canvas.getByText("Remember me"));
    await expect(control).toBeChecked();
    await expect(getComputedStyle(control).accentColor).toBe(
      probe(canvasElement, "accentColor", "var(--sg-color-primary)"),
    );
  },
};

export const Primary: Story = {
  args: { color: "primary", defaultChecked: true },
};
export const Secondary: Story = {
  args: { color: "secondary", defaultChecked: true },
};
export const Success: Story = {
  args: { color: "success", defaultChecked: true },
};
export const Danger: Story = {
  args: { color: "danger", defaultChecked: true },
};

export const Small: Story = { args: { size: "sm" } };
export const Medium: Story = { args: { size: "md" } };
export const Large: Story = { args: { size: "lg" } };

/** Each size is its `iconSize` token wide. */
export const Sizes: Story = {
  render: () => (
    <Flex gap={4} align="center">
      {(["sm", "md", "lg"] as const).map((size) => (
        <Checkbox key={size} size={size} aria-label={size} defaultChecked />
      ))}
    </Flex>
  ),
  play: async ({ canvas, canvasElement }) => {
    for (const size of ["sm", "md", "lg"] as const)
      await expect(getComputedStyle(canvas.getByLabelText(size)).width).toBe(
        probe(canvasElement, "width", `var(--sg-icon-${size})`),
      );
  },
};

/** One per intent, checked. */
export const Colors: Story = {
  render: () => (
    <Flex gap={4} align="center">
      {checkboxIntents.map((color) => (
        <Checkbox key={color} color={color} defaultChecked>
          {color}
        </Checkbox>
      ))}
    </Flex>
  ),
};

/** `disabled` blocks the change and dims the control through the theme's `opacity.disabled`. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    const control = canvas.getByRole("checkbox", { name: "Remember me" });
    await userEvent.click(control);
    await expect(control).not.toBeChecked();
    await expect(getComputedStyle(control).opacity).toBe("0.5");
  },
};
