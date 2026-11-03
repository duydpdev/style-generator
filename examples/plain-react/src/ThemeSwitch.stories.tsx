import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";

import { ThemeSwitch } from "./ThemeSwitch";

const meta = {
  title: "App/ThemeSwitch",
  component: ThemeSwitch,
} satisfies Meta<typeof ThemeSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Toggles: Story = {
  render: () => <ThemeSwitch />,
  play: async ({ canvasElement }) => {
    const html = canvasElement.ownerDocument.documentElement;
    const button = within(canvasElement).getByRole("button", {
      name: "Dark mode",
    });
    await userEvent.click(button);
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(button);
    await expect(html).not.toHaveAttribute("data-theme");
  },
};
