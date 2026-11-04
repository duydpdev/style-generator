import type { Meta, StoryObj } from "@storybook/react";
import { tokens } from "design-system-example";

import { Box, Grid } from "../ui";

const meta = {
  title: "UI/Box",
  component: Box,
  args: { children: "Box", p: 4, backgroundColor: "surface", rounded: "md" },
} satisfies Meta<typeof Box>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { p: 4 } };
/** Spacing per breakpoint: `p={{ base: 2, md: 4, lg: 8 }}`. */
export const ResponsiveSpacing: Story = {
  args: { p: { base: 2, md: 4, lg: 8 } },
};

/** Every colour token as `backgroundColor`. */
export const BackgroundColors: Story = {
  render: (args) => (
    <Grid columns={3} gap={2}>
      {tokens.colors.map((color) => (
        <Box key={color} {...args} backgroundColor={color} border="thin">
          {color}
        </Box>
      ))}
    </Grid>
  ),
};
/** Every colour token as `borderColor`. */
export const BorderColors: Story = {
  args: { border: "thick" },
  render: (args) => (
    <Grid columns={3} gap={2}>
      {tokens.colors.map((color) => (
        <Box key={color} {...args} borderColor={color}>
          {color}
        </Box>
      ))}
    </Grid>
  ),
};

export const Bordered: Story = {
  args: { border: "thin", borderColor: "line" },
};
export const BorderX: Story = {
  args: { borderX: "thick", borderColor: "primary" },
};
export const BorderY: Story = {
  args: { borderY: "thick", borderColor: "primary" },
};
export const BorderTop: Story = {
  args: { borderT: "thick", borderColor: "primary" },
};
export const BorderBottom: Story = {
  args: { borderB: "thick", borderColor: "primary" },
};
export const BorderLeft: Story = {
  args: { borderL: "thick", borderColor: "primary" },
};
export const BorderRight: Story = {
  args: { borderR: "thick", borderColor: "primary" },
};
export const InnerBorder: Story = {
  args: { innerBorder: true, border: "thick", borderColor: "primary" },
};

export const RoundedTop: Story = {
  args: { rounded: undefined, roundedT: "lg" },
};
export const RoundedBottom: Story = {
  args: { rounded: undefined, roundedB: "lg" },
};
export const RoundedLeft: Story = {
  args: { rounded: undefined, roundedL: "lg" },
};
export const RoundedRight: Story = {
  args: { rounded: undefined, roundedR: "lg" },
};

export const Shadow: Story = { args: { shadow: "md" } };

/** The blur filter needs something behind the box, so it sits on a coloured strip. */
export const BackdropBlur: Story = {
  args: {
    backdropBlur: "md",
    style: {
      backgroundColor:
        "color-mix(in srgb, var(--sg-color-background) 40%, transparent)",
    },
  },
  render: (args) => (
    <Box backgroundColor="accent" p={6}>
      <Box {...args} />
    </Box>
  ),
};

/** `position` against a `relative` parent. */
export const Positioned: Story = {
  args: { position: "absolute", style: { top: 8, right: 8 } },
  render: (args) => (
    <Box position="relative" height={128} border="thin" borderColor="line">
      <Box {...args} />
    </Box>
  ),
};

/** `width`, `minHeight` and `maxWidth` become inline style. */
export const Sizes: Story = {
  args: { width: 240, minHeight: 80, maxWidth: "100%" },
};

export const AsSection: Story = {
  args: { as: "section", "aria-label": "Section box" },
};
