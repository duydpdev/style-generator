import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Cta } from "./Cta";

const meta = {
  title: "Sections/Cta",
  component: Cta,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Cta>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Cta takes no props: the play check asserts its landmark heading. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Start from your own theme.json",
    );
  },
};
