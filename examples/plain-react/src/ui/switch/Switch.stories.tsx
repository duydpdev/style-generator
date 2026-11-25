import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent } from "storybook/test";

import { Flex } from "../flex";

import { switchIntents } from "./style";
import { Switch } from "./Switch";

const meta = {
  title: "UI/Switch",
  component: Switch,
  args: { "aria-label": "Notifications", size: "md" },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A computed `<property>` of a probe that reads a theme variable directly. */
const probe = (
  host: HTMLElement,
  property: "backgroundColor" | "width",
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

/** A click turns it on: `aria-checked` flips, the track takes the `color` token, the thumb moves, and `onCheckedChange` gets the new state. */
export const Default: Story = {
  args: { onCheckedChange: fn() },
  play: async ({ args, canvas, canvasElement }) => {
    const control = canvas.getByRole("switch", { name: "Notifications" });
    await expect(control).toHaveAttribute("aria-checked", "false");
    await expect(getComputedStyle(control).backgroundColor).toBe(
      probe(canvasElement, "backgroundColor", "var(--sg-color-muted)"),
    );
    await userEvent.click(control);
    await expect(control).toHaveAttribute("aria-checked", "true");
    await expect(args.onCheckedChange).toHaveBeenCalledWith(true);
    const thumb = control.firstElementChild;
    if (!(thumb instanceof HTMLElement)) throw new Error("no thumb");
    // The track colour and the thumb move are CSS transitions: let them finish first.
    await Promise.all(
      control.getAnimations({ subtree: true }).map((a) => a.finished),
    );
    await expect(getComputedStyle(control).backgroundColor).toBe(
      probe(canvasElement, "backgroundColor", "var(--sg-color-primary)"),
    );
    await expect(
      thumb.getBoundingClientRect().left - control.getBoundingClientRect().left,
    ).toBe(
      2 + Number.parseFloat(probe(canvasElement, "width", "var(--sg-icon-md)")),
    );
  },
};

export const Primary: Story = {
  args: { color: "primary", defaultChecked: true },
};
export const Secondary: Story = {
  args: { color: "secondary", defaultChecked: true },
};
export const Success: Story = {
  args: { color: "success", defaultChecked: true },
};
export const Danger: Story = {
  args: { color: "danger", defaultChecked: true },
};

export const Small: Story = { args: { size: "sm" } };
export const Medium: Story = { args: { size: "md" } };
export const Large: Story = { args: { size: "lg" } };

/** The thumb is its `iconSize` token wide; the track is two thumbs plus the padding. */
export const Sizes: Story = {
  render: () => (
    <Flex gap={4} align="center">
      {(["sm", "md", "lg"] as const).map((size) => (
        <Switch key={size} size={size} aria-label={size} />
      ))}
    </Flex>
  ),
  play: async ({ canvas, canvasElement }) => {
    for (const size of ["sm", "md", "lg"] as const) {
      const control = canvas.getByRole("switch", { name: size });
      const icon = Number.parseFloat(
        probe(canvasElement, "width", `var(--sg-icon-${size})`),
      );
      await expect(control.getBoundingClientRect().width).toBe(icon * 2 + 4);
      await expect(
        control.firstElementChild?.getBoundingClientRect().width,
      ).toBe(icon);
    }
  },
};

/** One per intent, on. */
export const Colors: Story = {
  render: () => (
    <Flex gap={4} align="center">
      {switchIntents.map((color) => (
        <Switch key={color} color={color} aria-label={color} defaultChecked />
      ))}
    </Flex>
  ),
};

/** `disabled` blocks the click and dims the switch through the theme's `opacity.disabled`. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    const control = canvas.getByRole("switch", { name: "Notifications" });
    await userEvent.click(control);
    await expect(control).toHaveAttribute("aria-checked", "false");
    await expect(getComputedStyle(control).opacity).toBe("0.5");
  },
};
