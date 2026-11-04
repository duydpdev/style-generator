import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Footer } from "./Footer";

const meta = {
  title: "Sections/Footer",
  component: Footer,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Footer takes no props: the play check asserts the licence line. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/MIT · 2026/)).toBeInTheDocument();
  },
};
