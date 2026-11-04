import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent } from "storybook/test";

import { Topbar } from "./Topbar";

const meta = {
  title: "Sections/Topbar",
  component: Topbar,
  parameters: { layout: "fullscreen" },
  args: {
    theme: "base",
    onCycleTheme: fn(),
    onOpenJson: fn(),
    onToggleTweaks: fn(),
  },
} satisfies Meta<typeof Topbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Each button calls its own handler once. */
export const Default: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Tweaks" }));
    await expect(args.onToggleTweaks).toHaveBeenCalledTimes(1);
    await userEvent.click(canvas.getByRole("button", { name: "Light" }));
    await expect(args.onCycleTheme).toHaveBeenCalledTimes(1);
    await userEvent.click(canvas.getByRole("button", { name: "theme.json" }));
    await expect(args.onOpenJson).toHaveBeenCalledTimes(1);
  },
};

export const Dark: Story = { args: { theme: "dark" } };
export const HighContrast: Story = { args: { theme: "highContrast" } };
