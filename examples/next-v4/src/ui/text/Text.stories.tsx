import type { Meta, StoryObj } from "@storybook/react";

import { tokens } from "../../theme";
import { Grid } from "../grid";

import { Text } from "./Text";

const meta = {
  title: "UI/Text",
  component: Text,
  args: { children: "The quick brown fox" },
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
  render: (args) => (
    <Grid columns={1} gap={2}>
      {tokens.typography.map((type) => (
        <Text key={type} {...args} type={type}>
          {type}
        </Text>
      ))}
    </Grid>
  ),
};

/** Every colour token as text colour. */
export const Colors: Story = {
  render: (args) => (
    <Grid columns={1} gap={1}>
      {tokens.colors.map((color) => (
        <Text key={color} {...args} color={color}>
          {color}
        </Text>
      ))}
    </Grid>
  ),
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
