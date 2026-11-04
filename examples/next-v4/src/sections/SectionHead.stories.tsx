import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { SectionHead } from "./SectionHead";

const meta = {
  title: "Sections/SectionHead",
  component: SectionHead,
  args: {
    eyebrow: "Features",
    title: "Everything comes from the theme",
    lede: "Change one token and every utility, type and component follows.",
  },
} satisfies Meta<typeof SectionHead>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2 })).toHaveTextContent(
      args.title,
    );
  },
};

export const LongLede: Story = {
  args: {
    lede: "One theme.json becomes Tailwind utilities, typed tokens and a styleless kit for your own components. Every part ships in one package, so you can pick where to start and grow from there.",
  },
};
