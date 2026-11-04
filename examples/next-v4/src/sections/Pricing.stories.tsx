import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Pricing } from "./Pricing";

const meta = {
  title: "Sections/Pricing",
  component: Pricing,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Pricing>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pricing takes no props: the play check asserts its landmark heading. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 2, name: "Free and MIT licensed" }),
    ).toHaveTextContent("Free and MIT licensed");
  },
};
