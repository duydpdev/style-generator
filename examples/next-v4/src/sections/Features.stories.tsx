import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Features } from "./Features";

const meta = {
  title: "Sections/Features",
  component: Features,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Features>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Features takes no props: the play check asserts its landmark heading. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Everything comes from the theme",
    );
  },
};
