import type { Meta, StoryObj } from "@storybook/vue3-vite";

import Badge from "./Badge.vue";
import { badgeIntents } from "./style";

import Flex from "~/ui/flex/Flex.vue";

const meta = {
  title: "UI/Badge",
  component: Badge,
  render: (args) => ({
    components: { Badge },
    setup() {
      return { args };
    },
    template: '<Badge v-bind="args">{{ args.default }}</Badge>',
  }),
  args: {
    default: "Badge",
    color: "primary",
    variant: "soft",
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { default: "Default" },
};

/** Every intent, `soft`. */
export const Soft: Story = {
  args: { variant: "soft" },
  render: (args) => ({
    components: { Badge, Flex },
    setup() {
      return { args, badgeIntents };
    },
    template: `
      <Flex wrap :gap="2">
        <Badge v-for="intent in badgeIntents" :key="intent" v-bind="args" :color="intent">
          {{ intent }}
        </Badge>
      </Flex>
    `,
  }),
};

/** Every intent, `solid`. */
export const Solid: Story = {
  args: { variant: "solid" },
  render: (args) => ({
    components: { Badge, Flex },
    setup() {
      return { args, badgeIntents };
    },
    template: `
      <Flex wrap :gap="2">
        <Badge v-for="intent in badgeIntents" :key="intent" v-bind="args" :color="intent">
          {{ intent }}
        </Badge>
      </Flex>
    `,
  }),
};

/** Every intent, `outline`. */
export const Outline: Story = {
  args: { variant: "outline" },
  render: (args) => ({
    components: { Badge, Flex },
    setup() {
      return { args, badgeIntents };
    },
    template: `
      <Flex wrap :gap="2">
        <Badge v-for="intent in badgeIntents" :key="intent" v-bind="args" :color="intent">
          {{ intent }}
        </Badge>
      </Flex>
    `,
  }),
};

export const Primary: Story = {
  args: { color: "primary", default: "primary" },
};
export const Secondary: Story = {
  args: { color: "secondary", default: "secondary" },
};
export const Success: Story = {
  args: { color: "success", default: "success" },
};
export const Danger: Story = {
  args: { color: "danger", default: "danger" },
};
