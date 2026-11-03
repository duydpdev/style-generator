import type { Meta, StoryObj } from "@storybook/react-vite";

import { Stack } from "./Stack";

const ITEM = "rounded-sm bg-surface p-2";
const items = ["One", "Two", "Three"].map((label) => (
  <div key={label} className={ITEM}>
    {label}
  </div>
));

const meta = {
  title: "UI/Stack",
  component: Stack,
  args: { gap: 2, children: items },
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Centered: Story = { args: { align: "center" } };
/** Gap per breakpoint: `gap={{ base: 1, md: 3, lg: 6 }}`. */
export const ResponsiveGap: Story = {
  args: { gap: { base: 1, md: 3, lg: 6 } },
};
