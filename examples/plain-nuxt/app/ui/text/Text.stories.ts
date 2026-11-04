import type { Meta, StoryObj } from "@storybook/vue3-vite";

import { tokens } from "../../theme";

import Text from "./Text.vue";

import Grid from "~/ui/grid/Grid.vue";

const meta = {
  title: "UI/Text",
  component: Text,
  render: (args) => ({
    components: { Text },
    setup() {
      return { args };
    },
    template: '<Text v-bind="args">{{ args.default }}</Text>',
  }),
  args: { default: "The quick brown fox" },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { type: "text16Medium", color: "foreground" },
};

export const Text12Mono: Story = { args: { type: "text12Mono" } };
export const Text14Regular: Story = { args: { type: "text14Regular" } };
export const Text16Medium: Story = { args: { type: "text16Medium" } };
export const Text20Semibold: Story = { args: { type: "text20Semibold" } };
export const Text32Bold: Story = { args: { type: "text32Bold" } };
export const Display56Serif: Story = { args: { type: "display56Serif" } };

/** Every typography token. */
export const TypeScale: Story = {
  render: (args) => ({
    components: { Text, Grid },
    setup() {
      return { args, typography: tokens.typography };
    },
    template: `
      <Grid :columns="1" :gap="2">
        <Text v-for="type in typography" :key="type" v-bind="args" :type="type">
          {{ type }}
        </Text>
      </Grid>
    `,
  }),
};

/** Every colour token as text colour. */
export const Colors: Story = {
  render: (args) => ({
    components: { Text, Grid },
    setup() {
      return { args, colors: tokens.colors };
    },
    template: `
      <Grid :columns="1" :gap="1">
        <Text v-for="color in colors" :key="color" v-bind="args" :color="color">
          {{ color }}
        </Text>
      </Grid>
    `,
  }),
};

export const AlignLeft: Story = { args: { align: "left" } };
export const AlignCenter: Story = { args: { align: "center" } };
export const AlignRight: Story = { args: { align: "right" } };

export const DecorationUnderline: Story = {
  args: { decoration: "underline" },
};
export const DecorationLineThrough: Story = {
  args: { decoration: "lineThrough" },
};
export const DecorationNone: Story = { args: { decoration: "none" } };

export const AlignAndDecoration: Story = {
  args: { align: "center", decoration: "underline" },
};
