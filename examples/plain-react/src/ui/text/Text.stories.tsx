import type { Meta, StoryObj } from "@storybook/react-vite";

import { tokens } from "../../theme";

import { Text } from "./Text";

const meta = {
  title: "UI/Text",
  component: Text,
  args: { children: "The quick brown fox" },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every typography token. */
export const TypeScale: Story = {
  render: () => (
    <div className="grid gap-2">
      {tokens.typography.map((type) => (
        <Text key={type} type={type}>
          {type}
        </Text>
      ))}
    </div>
  ),
};

/** Every colour token as text colour. */
export const Colors: Story = {
  render: () => (
    <div className="grid gap-1">
      {tokens.colors.map((color) => (
        <Text key={color} color={color}>
          {color}
        </Text>
      ))}
    </div>
  ),
};

export const AlignAndDecoration: Story = {
  args: { align: "center", decoration: "underline" },
};
