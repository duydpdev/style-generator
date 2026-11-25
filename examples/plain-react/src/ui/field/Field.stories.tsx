import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent } from "storybook/test";

import { Input } from "../input";
import { Select } from "../select";

import { Field } from "./Field";

const meta = {
  title: "UI/Field",
  component: Field,
  args: {
    label: "Email",
    children: (control) => <Input {...control} placeholder="you@example.com" />,
  },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Clicking the label focuses the control: `htmlFor` points at the id the field hands to it. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByText("Email"));
    await expect(canvas.getByRole("textbox", { name: "Email" })).toHaveFocus();
  },
};

/** The hint describes the control. */
export const WithHint: Story = {
  args: { hint: "We never share it." },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("textbox", { name: "Email" }),
    ).toHaveAccessibleDescription("We never share it.");
  },
};

/** An error marks the control invalid and describes it after the hint, so the state is never colour only. */
export const WithError: Story = {
  args: { hint: "We never share it.", error: "Enter a valid email." },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Email" });
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleDescription(
      "We never share it. Enter a valid email.",
    );
  },
};

/** `error={touched && message}` before a touch: `false` renders no error and leaves the control valid. */
export const NoError: Story = {
  args: { error: false },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Email" });
    await expect(input).not.toHaveAttribute("aria-invalid");
    await expect(input).not.toHaveAttribute("aria-describedby");
  },
};

/** Any control takes the field props: here a select. */
export const WithSelect: Story = {
  args: {
    label: "Plan",
    children: (control) => (
      <Select {...control}>
        <option>Free</option>
        <option>Pro</option>
      </Select>
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox", { name: "Plan" })).toBeVisible();
  },
};
