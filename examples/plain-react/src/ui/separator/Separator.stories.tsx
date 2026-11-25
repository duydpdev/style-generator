import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Flex } from "../flex";
import { Stack } from "../stack";
import { Text } from "../text";

import { Separator } from "./Separator";

const meta = {
  title: "UI/Separator",
  component: Separator,
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A computed `<property>` of a probe that reads a theme variable directly. */
const probe = (
  host: HTMLElement,
  property: "borderTopColor" | "width",
  value: string,
): string => {
  const span = host.ownerDocument.createElement("span");
  span.style.display = "block";
  span.style[property] = value;
  host.append(span);
  const computed = getComputedStyle(span)[property];
  span.remove();
  return computed;
};

/** A full-width rule, one `thin` border tall, in the `border` colour. */
export const Default: Story = {
  render: () => (
    <Stack gap={2}>
      <Text>Above</Text>
      <Separator />
      <Text>Below</Text>
    </Stack>
  ),
  play: async ({ canvas, canvasElement }) => {
    const rule = canvas.getByRole("separator");
    const style = getComputedStyle(rule);
    await expect(style.borderTopWidth).toBe(
      probe(canvasElement, "width", "var(--sg-border-width-thin)"),
    );
    await expect(style.borderTopColor).toBe(
      probe(canvasElement, "borderTopColor", "var(--sg-color-border)"),
    );
    await expect(rule.getBoundingClientRect().width).toBe(
      rule.parentElement?.getBoundingClientRect().width,
    );
  },
};

/** Between inline items it stretches to the row's height and says `aria-orientation="vertical"`. */
export const Vertical: Story = {
  render: () => (
    <Flex gap={2} align="stretch">
      <Text>Left</Text>
      <Separator orientation="vertical" />
      <Text>Right</Text>
    </Flex>
  ),
  play: async ({ canvas }) => {
    const rule = canvas.getByRole("separator");
    await expect(rule).toHaveAttribute("aria-orientation", "vertical");
    await expect(rule.getBoundingClientRect().height).toBe(
      rule.parentElement?.getBoundingClientRect().height,
    );
  },
};

/** `decorative` hides it from assistive technology. */
export const Decorative: Story = {
  args: { decorative: true },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("separator")).toBeNull();
  },
};
