import type { Meta, StoryObj } from "@storybook/react";

import { Flex } from "../flex";

import { Badge } from "./Badge";
import { badgeIntents } from "./style";

const meta = {
  title: "UI/Badge",
  component: Badge,
  args: { children: "Badge", color: "primary", variant: "soft" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: "Default" } };

/** Every intent, `soft`. */
export const Soft: Story = {
  args: { variant: "soft" },
  render: (args) => (
    <Flex wrap gap={2}>
      {badgeIntents.map((intent) => (
        <Badge key={intent} {...args} color={intent}>
          {intent}
        </Badge>
      ))}
    </Flex>
  ),
};

/** Every intent, `solid`. */
export const Solid: Story = {
  args: { variant: "solid" },
  render: (args) => (
    <Flex wrap gap={2}>
      {badgeIntents.map((intent) => (
        <Badge key={intent} {...args} color={intent}>
          {intent}
        </Badge>
      ))}
    </Flex>
  ),
};

/** Every intent, `outline`. */
export const Outline: Story = {
  args: { variant: "outline" },
  render: (args) => (
    <Flex wrap gap={2}>
      {badgeIntents.map((intent) => (
        <Badge key={intent} {...args} color={intent}>
          {intent}
        </Badge>
      ))}
    </Flex>
  ),
};

export const Primary: Story = {
  args: { color: "primary", children: "primary" },
};
export const Secondary: Story = {
  args: { color: "secondary", children: "secondary" },
};
export const Success: Story = {
  args: { color: "success", children: "success" },
};
export const Danger: Story = { args: { color: "danger", children: "danger" } };
