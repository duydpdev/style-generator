import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { StyleValue } from "vue";

import { tokens } from "../../theme";

import Box from "./Box.vue";
import type { BoxProps } from "./types";

import Grid from "~/ui/grid/Grid.vue";

interface BoxArgs extends BoxProps {
  default?: string;
  "aria-label"?: string;
  style?: StyleValue;
}

const meta = {
  title: "UI/Box",
  component: Box,
  render: (args) => ({
    components: { Box },
    setup() {
      return { args };
    },
    template: '<Box v-bind="args">{{ args.default }}</Box>',
  }),
  args: {
    default: "Box",
    p: 4,
    backgroundColor: "surface",
    rounded: "md",
  },
} satisfies Meta<BoxArgs>;

export default meta;
type Story = StoryObj<BoxArgs>;

export const Default: Story = { args: { p: 4 } };

/** Spacing per breakpoint: `p={{ base: 2, md: 4, lg: 8 }}`. */
export const ResponsiveSpacing: Story = {
  args: { p: { base: 2, md: 4, lg: 8 } },
};

/** Every colour token as `backgroundColor`. */
export const BackgroundColors: Story = {
  render: (args) => ({
    components: { Box, Grid },
    setup() {
      return { args, colors: tokens.colors };
    },
    template: `
      <Grid :columns="3" :gap="2">
        <Box v-for="color in colors" :key="color" v-bind="args" :background-color="color" border="thin">
          {{ color }}
        </Box>
      </Grid>
    `,
  }),
};

/** Every colour token as `borderColor`. */
export const BorderColors: Story = {
  args: { border: "thick" },
  render: (args) => ({
    components: { Box, Grid },
    setup() {
      return { args, colors: tokens.colors };
    },
    template: `
      <Grid :columns="3" :gap="2">
        <Box v-for="color in colors" :key="color" v-bind="args" :border-color="color">
          {{ color }}
        </Box>
      </Grid>
    `,
  }),
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

/** The frosted surface needs something behind the box, so it sits on a coloured strip. */
export const BackdropBlur: Story = {
  args: {
    backdropBlur: "md",
    style: {
      backgroundColor:
        "color-mix(in srgb, var(--sg-color-background) 40%, transparent)",
    },
  },
  render: (args) => ({
    components: { Box },
    setup() {
      return { args };
    },
    template: `
      <Box background-color="accent" :p="6">
        <Box v-bind="args">{{ args.default }}</Box>
      </Box>
    `,
  }),
};

/** `position` against a `relative` parent. */
export const Positioned: Story = {
  args: { position: "absolute", style: { top: 8, right: 8 } },
  render: (args) => ({
    components: { Box },
    setup() {
      return { args };
    },
    template: `
      <Box position="relative" :height="128" rounded="md" border="thin" border-color="line">
        <Box v-bind="args">{{ args.default }}</Box>
      </Box>
    `,
  }),
};

/** `width`, `minHeight` and `maxWidth` become inline style. */
export const Sizes: Story = {
  args: { width: 240, minHeight: 80, maxWidth: "100%" },
};

export const AsSection: Story = {
  args: { as: "section", "aria-label": "Section box" },
};
