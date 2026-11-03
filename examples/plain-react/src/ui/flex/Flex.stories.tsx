import type { Meta, StoryObj } from "@storybook/react-vite";

import { Flex } from "./Flex";

const ITEM = "rounded-sm bg-surface p-2";
const items = ["One", "Two", "Three"].map((label) => (
  <div key={label} className={ITEM}>
    {label}
  </div>
));

const meta = {
  title: "UI/Flex",
  component: Flex,
  args: { gap: 2, children: items },
} satisfies Meta<typeof Flex>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const SpaceBetween: Story = { args: { justify: "between" } };
export const Wrapped: Story = {
  args: {
    wrap: true,
    children: Array.from({ length: 12 }, (_, index) => (
      <div key={index} className={ITEM}>
        {index + 1}
      </div>
    )),
  },
};
