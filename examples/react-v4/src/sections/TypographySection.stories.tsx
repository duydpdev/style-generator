import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { TypographySection } from "./TypographySection";

const meta = {
  title: "Sections/TypographySection",
  component: TypographySection,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TypographySection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** TypographySection takes no props: the play check asserts the heading. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Two voices, one rhythm.",
    );
  },
};
