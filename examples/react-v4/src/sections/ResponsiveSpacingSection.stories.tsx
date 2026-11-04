import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { ResponsiveSpacingSection } from "./ResponsiveSpacingSection";

const meta = {
  title: "Sections/ResponsiveSpacingSection",
  component: ResponsiveSpacingSection,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ResponsiveSpacingSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ResponsiveSpacingSection takes no props: the play check asserts the heading and the first demo. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Spacing reacts to breakpoints.",
    );
    await expect(
      canvas.getByText("Padding scales with viewport"),
    ).toBeVisible();
  },
};
