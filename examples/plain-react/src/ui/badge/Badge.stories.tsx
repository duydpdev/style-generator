import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "./Badge";
import { badgeIntents } from "./style";

const meta = {
  title: "UI/Badge",
  component: Badge,
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Soft: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {badgeIntents.map((intent) => (
        <Badge key={intent} color={intent} variant="soft">
          {intent}
        </Badge>
      ))}
    </div>
  ),
};

export const Solid: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {badgeIntents.map((intent) => (
        <Badge key={intent} color={intent} variant="solid">
          {intent}
        </Badge>
      ))}
    </div>
  ),
};

export const Outline: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {badgeIntents.map((intent) => (
        <Badge key={intent} color={intent} variant="outline">
          {intent}
        </Badge>
      ))}
    </div>
  ),
};
