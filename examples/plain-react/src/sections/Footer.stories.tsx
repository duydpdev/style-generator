import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";

import { Footer } from "./Footer";

const meta = {
  title: "Sections/Footer",
  component: Footer,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Footer takes no props: the play check asserts the three links. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const nav = canvas.getByRole("navigation", { name: "Footer" });
    await expect(within(nav).getAllByRole("link")).toHaveLength(3);
  },
};
