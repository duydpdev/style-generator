import type { Meta, StoryObj } from "@storybook/react";

import { Box } from "../box";

import { Stack } from "./Stack";

const ITEM = { backgroundColor: "surface", rounded: "sm", p: 2 } as const;
const items = ["One", "Two", "Three"].map((label) => (
  <Box key={label} {...ITEM}>
    {label}
  </Box>
));

const meta = {
  title: "UI/Stack",
  component: Stack,
  args: { gap: 2, children: items },
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { direction: "column" } };
export const Row: Story = { args: { direction: "row" } };

export const AlignStart: Story = { args: { align: "start" } };
export const Centered: Story = { args: { align: "center" } };
export const AlignEnd: Story = { args: { align: "end" } };
export const AlignStretch: Story = { args: { align: "stretch" } };

export const JustifyStart: Story = {
  args: { justify: "start", minHeight: 240 },
};
export const JustifyCenter: Story = {
  args: { justify: "center", minHeight: 240 },
};
export const JustifyEnd: Story = { args: { justify: "end", minHeight: 240 } };
export const SpaceBetween: Story = {
  args: { justify: "between", minHeight: 240 },
};

export const Wrapped: Story = {
  args: {
    direction: "row",
    wrap: true,
    children: Array.from({ length: 12 }, (_, index) => (
      <Box key={index} {...ITEM}>
        {index + 1}
      </Box>
    )),
  },
};

/** Gap per breakpoint: `gap={{ base: 1, md: 3, lg: 6 }}`. */
export const ResponsiveGap: Story = {
  args: { gap: { base: 1, md: 3, lg: 6 } },
};
