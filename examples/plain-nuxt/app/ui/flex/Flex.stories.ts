import type { Meta, StoryObj } from "@storybook/vue3-vite";

import Flex from "./Flex.vue";

import Box from "~/ui/box/Box.vue";

const items = ["One", "Two", "Three"];
const wrappedItems = Array.from({ length: 12 }, (_, index) => index + 1);

const meta = {
  title: "UI/Flex",
  component: Flex,
  render: (args) => ({
    components: { Flex, Box },
    setup() {
      return { args, items };
    },
    template: `
      <Flex v-bind="args">
        <Box v-for="item in items" :key="item" background-color="surface" rounded="sm" :p="2">
          {{ item }}
        </Box>
      </Flex>
    `,
  }),
  args: { gap: 2 },
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
  args: { wrap: true },
  render: (args) => ({
    components: { Flex, Box },
    setup() {
      return { args, wrappedItems };
    },
    template: `
      <Flex v-bind="args">
        <Box v-for="n in wrappedItems" :key="n" background-color="surface" rounded="sm" :p="2">
          {{ n }}
        </Box>
      </Flex>
    `,
  }),
};
