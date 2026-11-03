import type { Meta, StoryObj } from "@storybook/react-vite";

import { Box } from "./Box";

const meta = {
  title: "UI/Box",
  component: Box,
  args: { children: "Box", p: 4, backgroundColor: "surface", rounded: "md" },
} satisfies Meta<typeof Box>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Bordered: Story = {
  args: { border: "thin", borderColor: "line" },
};
export const InnerBorder: Story = {
  args: { innerBorder: true, border: "thick", borderColor: "primary" },
};
export const Shadow: Story = { args: { shadow: "md" } };
/** Spacing per breakpoint: `p={{ base: 2, md: 4, lg: 8 }}`. */
export const ResponsiveSpacing: Story = {
  args: { p: { base: 2, md: 4, lg: 8 } },
};
