import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { UtilitiesSection } from "./UtilitiesSection";

const meta = {
  title: "Sections/UtilitiesSection",
  component: UtilitiesSection,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof UtilitiesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** UtilitiesSection takes no props: the play check asserts the heading. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2 })).toHaveTextContent(
      "A measured cadence.",
    );
  },
};
