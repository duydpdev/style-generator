import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent } from "storybook/test";

import { HeroSection } from "./HeroSection";

const meta = {
  title: "Sections/HeroSection",
  component: HeroSection,
  parameters: { layout: "fullscreen" },
  args: { palette: "base", onPickPalette: fn() },
} satisfies Meta<typeof HeroSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Picking a palette reports its id, and `aria-pressed` follows the `palette` arg. */
export const Default: Story = {
  play: async ({ args, canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Cobalt" }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(canvas.getByRole("button", { name: "Forest" }));
    await expect(args.onPickPalette).toHaveBeenCalledTimes(1);
    await expect(args.onPickPalette).toHaveBeenCalledWith("forest");
  },
};

export const Forest: Story = { args: { palette: "forest" } };
export const Sunset: Story = { args: { palette: "sunset" } };
export const Mono: Story = { args: { palette: "mono" } };
