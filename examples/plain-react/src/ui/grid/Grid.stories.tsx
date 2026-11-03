import type { Meta, StoryObj } from "@storybook/react-vite";

import { Grid } from "./Grid";

const ITEM = "rounded-sm bg-surface p-2";
const items = ["One", "Two", "Three", "Four", "Five", "Six"].map((label) => (
  <div key={label} className={ITEM}>
    {label}
  </div>
));

const meta = {
  title: "UI/Grid",
  component: Grid,
  args: { gap: 2, columns: 3, children: items },
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ResponsiveColumns: Story = {
  args: { columns: { base: 1, md: 2, lg: 3 } },
};
export const TrackList: Story = { args: { columns: "80px 1fr 80px" } };
