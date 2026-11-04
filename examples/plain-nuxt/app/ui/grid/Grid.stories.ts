import type { Meta, StoryObj } from "@storybook/vue3-vite";

import Grid from "./Grid.vue";

import Box from "~/ui/box/Box.vue";

const items = ["One", "Two", "Three", "Four", "Five", "Six"];

const meta = {
  title: "UI/Grid",
  component: Grid,
  render: (args) => ({
    components: { Grid, Box },
    setup() {
      return { args, items };
    },
    template: `
      <Grid v-bind="args">
        <Box v-for="item in items" :key="item" background-color="surface" rounded="sm" :p="2">
          {{ item }}
        </Box>
      </Grid>
    `,
  }),
  args: { gap: 2, columns: 3 },
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { columns: 3 } };
export const ResponsiveColumns: Story = {
  args: { columns: { base: 1, md: 2, lg: 3 } },
};
export const TrackList: Story = { args: { columns: "80px 1fr 80px" } };

export const AlignStart: Story = { args: { align: "start", minHeight: 160 } };
export const AlignCenter: Story = { args: { align: "center", minHeight: 160 } };
export const AlignEnd: Story = { args: { align: "end", minHeight: 160 } };
export const AlignStretch: Story = {
  args: { align: "stretch", minHeight: 160 },
};

export const JustifyStart: Story = {
  args: { justify: "start", columns: "80px 80px 80px" },
};
export const JustifyCenter: Story = {
  args: { justify: "center", columns: "80px 80px 80px" },
};
export const JustifyEnd: Story = {
  args: { justify: "end", columns: "80px 80px 80px" },
};
export const JustifyBetween: Story = {
  args: { justify: "between", columns: "80px 80px 80px" },
};

export const FlowRow: Story = { args: { flow: "row" } };
export const FlowColumn: Story = { args: { flow: "column" } };
export const FlowDense: Story = { args: { flow: "dense" } };
