import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { ButtonSection } from "./ButtonSection";

const meta = {
  title: "Sections/ButtonSection",
  component: ButtonSection,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ButtonSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ButtonSection takes no props: the play check asserts the heading and the 19 buttons (4 variants × 4 intents, 3 sizes). */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2 })).toHaveTextContent(
      "cva × compoundVariants.",
    );
    await expect(canvas.getAllByRole("button")).toHaveLength(19);
  },
};
