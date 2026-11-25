import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent } from "storybook/test";

import { Textarea } from "./Textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  args: { "aria-label": "Notes", placeholder: "Write a note", size: "md" },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Typing updates the value. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const control = canvas.getByRole("textbox", { name: "Notes" });
    await userEvent.type(control, "hello");
    await expect(control).toHaveValue("hello");
  },
};

export const Small: Story = { args: { size: "sm" } };
export const Medium: Story = { args: { size: "md" } };
export const Large: Story = { args: { size: "lg" } };

/** `disabled` blocks input and dims the control through the theme's `opacity.disabled`. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    const control = canvas.getByRole("textbox", { name: "Notes" });
    await expect(control).toBeDisabled();
    await expect(getComputedStyle(control).opacity).toBe("0.5");
  },
};

/** `invalid` sets `aria-invalid`, which also draws the danger border. */
export const Invalid: Story = {
  args: { invalid: true },
  play: async ({ canvas, canvasElement }) => {
    const control = canvas.getByRole("textbox", { name: "Notes" });
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
