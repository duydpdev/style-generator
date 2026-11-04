import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Hero } from "./Hero";

const meta = {
  title: "Sections/Hero",
  component: Hero,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Hero>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hero takes no props: the play check asserts its landmark heading. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Tokens in, a design system out.",
    );
  },
};
