import type { Meta, StoryObj } from "@storybook/vue3-vite";

import Stack from "./Stack.vue";

import Box from "~/ui/box/Box.vue";

const items = ["One", "Two", "Three"];
const wrappedItems = Array.from({ length: 12 }, (_, index) => index + 1);

const meta = {
  title: "UI/Stack",
  component: Stack,
  render: (args) => ({
    components: { Stack, Box },
    setup() {
      return { args, items };
    },
    template: `
      <Stack v-bind="args">
        <Box v-for="item in items" :key="item" background-color="surface" rounded="sm" :p="2">
          {{ item }}
        </Box>
      </Stack>
    `,
  }),
  args: { gap: 2 },
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
  args: { direction: "row", wrap: true },
  render: (args) => ({
    components: { Stack, Box },
    setup() {
      return { args, wrappedItems };
    },
    template: `
      <Stack v-bind="args">
        <Box v-for="n in wrappedItems" :key="n" background-color="surface" rounded="sm" :p="2">
          {{ n }}
        </Box>
      </Stack>
    `,
  }),
};

/** Gap per breakpoint: `gap={{ base: 1, md: 3, lg: 6 }}`. */
export const ResponsiveGap: Story = {
  args: { gap: { base: 1, md: 3, lg: 6 } },
};
