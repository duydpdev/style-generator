import type { Meta, StoryObj } from "@storybook/react";

import { Box, Flex } from "../ui";

const ITEM = { backgroundColor: "surface", rounded: "sm", p: 2 } as const;
const items = ["One", "Two", "Three"].map((label) => (
  <Box key={label} {...ITEM}>
    {label}
  </Box>
));

const meta = {
  title: "UI/Flex",
  component: Flex,
  args: { gap: 2, children: items },
} satisfies Meta<typeof Flex>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { direction: "row" } };
export const Column: Story = { args: { direction: "column" } };

export const AlignStart: Story = { args: { align: "start", minHeight: 80 } };
export const AlignCenter: Story = { args: { align: "center", minHeight: 80 } };
export const AlignEnd: Story = { args: { align: "end", minHeight: 80 } };
export const AlignStretch: Story = {
  args: { align: "stretch", minHeight: 80 },
};

export const JustifyStart: Story = { args: { justify: "start" } };
export const JustifyCenter: Story = { args: { justify: "center" } };
export const JustifyEnd: Story = { args: { justify: "end" } };
export const SpaceBetween: Story = { args: { justify: "between" } };

export const Wrapped: Story = {
  args: {
    wrap: true,
    children: Array.from({ length: 12 }, (_, index) => (
      <Box key={index} {...ITEM}>
        {index + 1}
      </Box>
    )),
  },
};
