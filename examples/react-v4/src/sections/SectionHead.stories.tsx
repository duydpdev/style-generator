import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { SectionHead } from "./SectionHead";

const meta = {
  title: "Sections/SectionHead",
  component: SectionHead,
  args: {
    num: "01 — Color",
    title: "A four-role palette.",
    desc: "Each token resolves at runtime via custom properties.",
  },
} satisfies Meta<typeof SectionHead>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2 })).toHaveTextContent(
      "A four-role palette.",
    );
  },
};

export const WithMarkup: Story = {
  args: {
    desc: (
      <>
        Padding compiles to inline <code>--sg-sp-*</code> variables.
      </>
    ),
  },
};
