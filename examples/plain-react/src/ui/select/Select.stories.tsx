import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent } from "storybook/test";

import { Select } from "./Select";

const meta = {
  title: "UI/Select",
  component: Select,
  args: {
    "aria-label": "Plan",
    size: "md",
    children: (
      <>
        <option value="free">Free</option>
        <option value="pro">Pro</option>
      </>
    ),
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Picking an option updates the value. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const control = canvas.getByRole("combobox", { name: "Plan" });
    await userEvent.selectOptions(control, "pro");
    await expect(control).toHaveValue("pro");
  },
};

export const Small: Story = { args: { size: "sm" } };
export const Medium: Story = { args: { size: "md" } };
export const Large: Story = { args: { size: "lg" } };

/** `disabled` blocks input and dims the control through the theme's `opacity.disabled`. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    const control = canvas.getByRole("combobox", { name: "Plan" });
    await expect(control).toBeDisabled();
    await expect(getComputedStyle(control).opacity).toBe("0.5");
  },
};

/** `invalid` sets `aria-invalid`, which also draws the danger border. */
export const Invalid: Story = {
  args: { invalid: true },
  play: async ({ canvas, canvasElement }) => {
    const control = canvas.getByRole("combobox", { name: "Plan" });
    await expect(control).toHaveAttribute("aria-invalid", "true");
    const probe = canvasElement.ownerDocument.createElement("span");
    probe.style.borderTopColor = "var(--sg-color-danger)";
    probe.style.borderTopStyle = "solid";
    canvasElement.append(probe);
    const danger = getComputedStyle(probe).borderTopColor;
    probe.remove();
    await expect(getComputedStyle(control).borderTopColor).toBe(danger);
  },
};
