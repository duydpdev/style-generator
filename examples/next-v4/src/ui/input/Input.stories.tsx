import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent } from "storybook/test";

import { Input } from "./Input";

const meta = {
  title: "UI/Input",
  component: Input,
  args: { "aria-label": "Input", placeholder: "Type here", size: "md" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Typing updates the value. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Input" });
    await userEvent.type(input, "hello");
    await expect(input).toHaveValue("hello");
  },
};

export const Small: Story = {
  args: { size: "sm", "aria-label": "Small", placeholder: "Small" },
};
export const Medium: Story = {
  args: { size: "md", "aria-label": "Medium", placeholder: "Medium" },
};
export const Large: Story = {
  args: { size: "lg", "aria-label": "Large", placeholder: "Large" },
};

export const Disabled: Story = {
  args: { "aria-label": "Disabled", disabled: true, defaultValue: "Disabled" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("textbox", { name: "Disabled" }),
    ).toBeDisabled();
  },
};

export const ReadOnly: Story = {
  args: {
    "aria-label": "Read only",
    readOnly: true,
    defaultValue: "Read only",
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Read only" });
    await expect(input).toHaveAttribute("readonly");
    await userEvent.type(input, "x");
    await expect(input).toHaveValue("Read only");
  },
};

export const Invalid: Story = {
  args: { "aria-label": "Email", invalid: true, defaultValue: "not-an-email" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("textbox", { name: "Email" }),
    ).toHaveAttribute("aria-invalid", "true");
  },
};
