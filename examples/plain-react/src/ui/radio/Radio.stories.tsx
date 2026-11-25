import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent } from "storybook/test";

import { Flex } from "../flex";

import { Radio } from "./Radio";
import { radioIntents } from "./style";

const meta = {
  title: "UI/Radio",
  component: Radio,
  args: { children: "Express delivery", size: "md" },
} satisfies Meta<typeof Radio>;

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

/** Clicking the label checks the radio; its accent colour is the `color` token. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const control = canvas.getByRole("radio", { name: "Express delivery" });
    await userEvent.click(canvas.getByText("Express delivery"));
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
        <Radio key={size} size={size} aria-label={size} defaultChecked />
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
      {radioIntents.map((color) => (
        <Radio key={color} color={color} defaultChecked>
          {color}
        </Radio>
      ))}
    </Flex>
  ),
};

/** `disabled` blocks the change and dims the control through the theme's `opacity.disabled`. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    const control = canvas.getByRole("radio", { name: "Express delivery" });
    await userEvent.click(control);
    await expect(control).not.toBeChecked();
    await expect(getComputedStyle(control).opacity).toBe("0.5");
  },
};

/** Radios sharing a `name` form one group: checking one unchecks the other. */
export const Group: Story = {
  render: () => (
    <Flex gap={4} align="center">
      <Radio name="plan" value="free" defaultChecked>
        Free
      </Radio>
      <Radio name="plan" value="pro">
        Pro
      </Radio>
    </Flex>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("radio", { name: "Pro" }));
    await expect(canvas.getByRole("radio", { name: "Pro" })).toBeChecked();
    await expect(canvas.getByRole("radio", { name: "Free" })).not.toBeChecked();
  },
};
