import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, userEvent } from "storybook/test";

import Input from "./Input.vue";
import type { InputProps } from "./types";

interface InputArgs extends InputProps {
  "aria-label"?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  defaultValue?: string;
  value?: string;
}

const meta = {
  title: "UI/Input",
  component: Input,
  render: (args) => ({
    components: { Input },
    setup() {
      return {
        args: {
          ...(args.defaultValue !== undefined && args.value === undefined
            ? { value: args.defaultValue }
            : {}),
          ...args,
        },
      };
    },
    template: '<Input v-bind="args" />',
  }),
  args: { "aria-label": "Input", placeholder: "Type here", size: "md" },
} satisfies Meta<InputArgs>;

export default meta;
type Story = StoryObj<InputArgs>;

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
