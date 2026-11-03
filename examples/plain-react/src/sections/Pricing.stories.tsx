import type { Meta, StoryObj } from "@storybook/react-vite";

import { Pricing } from "./Pricing";

const meta = {
  title: "Sections/Pricing",
  component: Pricing,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Pricing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
