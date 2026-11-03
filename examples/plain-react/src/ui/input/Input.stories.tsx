import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { Input } from "./Input";

const meta = {
  title: "UI/Input",
  component: Input,
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sizes: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-3">
      <Input size="sm" aria-label="Small" placeholder="Small" />
      <Input size="md" aria-label="Medium" placeholder="Medium" />
      <Input size="lg" aria-label="Large" placeholder="Large" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Input aria-label="Disabled" disabled defaultValue="Read only" />
  ),
};

export const Invalid: Story = {
  render: () => (
    <Input aria-label="Email" invalid defaultValue="not-an-email" />
  ),
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", {
      name: "Email",
    });
    await expect(input).toHaveAttribute("aria-invalid", "true");
  },
};
