import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent } from "storybook/test";

import { ThemeSwitch } from "./ThemeSwitch";

const meta = {
  title: "App/ThemeSwitch",
  component: ThemeSwitch,
} satisfies Meta<typeof ThemeSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ThemeSwitch takes no props: the toggle sets and removes `data-theme` on `<html>`. */
export const Toggles: Story = {
  play: async ({ canvas, canvasElement }) => {
    const html = canvasElement.ownerDocument.documentElement;
    const button = canvas.getByRole("button", { name: "Dark mode" });
    await userEvent.click(button);
    await expect(html).toHaveAttribute("data-theme", "dark");
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(button);
    await expect(html).not.toHaveAttribute("data-theme");
  },
};
