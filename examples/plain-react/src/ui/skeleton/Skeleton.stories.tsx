import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Stack } from "../stack";

import { Skeleton } from "./Skeleton";

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  args: { style: { width: 128, height: 16 } },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hidden from assistive technology, it pulses in the `border` colour at the size the app gives it. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const block = canvasElement.querySelector("[aria-hidden]");
    if (!(block instanceof HTMLElement)) throw new Error("no skeleton");
    await expect(block.getBoundingClientRect().width).toBe(128);
    await expect(block.getAnimations()).not.toHaveLength(0);
    const span = canvasElement.ownerDocument.createElement("span");
    span.style.backgroundColor = "var(--sg-color-border)";
    canvasElement.append(span);
    const fill = getComputedStyle(span).backgroundColor;
    span.remove();
    await expect(getComputedStyle(block).backgroundColor).toBe(fill);
  },
};

/** A loading card: the region says it is busy, the blocks stand in for its lines. */
export const Card: Story = {
  render: () => (
    <div aria-busy="true" aria-label="Profile">
      <Stack gap={2}>
        <Skeleton style={{ width: 40, height: 40 }} />
        <Skeleton style={{ width: 192, height: 16 }} />
        <Skeleton style={{ width: 128, height: 16 }} />
      </Stack>
    </div>
  ),
};
