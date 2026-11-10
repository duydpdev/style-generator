import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent } from "storybook/test";

import { Flex } from "../flex";
import { Stack } from "../stack";

import { Button } from "./Button";
import { buttonIntents, buttonTables } from "./style";

type ButtonVariant = keyof typeof buttonTables.variants.variant;
type ButtonSize = keyof typeof buttonTables.variants.size;

const variants = Object.keys(buttonTables.variants.variant) as ButtonVariant[];
const sizes = Object.keys(buttonTables.variants.size) as ButtonSize[];

const meta = {
  title: "UI/Button",
  component: Button,
  args: { children: "Button", onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default variant, intent and size; the play check proves the fill is the theme's `primary` colour, read from a probe that uses the CSS variable directly. */
export const Default: Story = {
  args: { variant: "fill", color: "primary", size: "md" },
  play: async ({ canvas, canvasElement }) => {
    const button = canvas.getByRole("button", { name: "Button" });
    const probe = canvasElement.ownerDocument.createElement("span");
    probe.style.backgroundColor = "var(--sg-color-primary)";
    canvasElement.append(probe);
    const primary = getComputedStyle(probe).backgroundColor;
    probe.remove();
    await expect(primary).not.toBe("rgba(0, 0, 0, 0)");
    await expect(getComputedStyle(button).backgroundColor).toBe(primary);
  },
};

/** A click reaches the handler exactly once. */
export const Clickable: Story = {
  args: { onClick: fn() },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Button" }));
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

/** `disabled` blocks the click: the handler is never called. */
export const Disabled: Story = {
  args: { disabled: true, onClick: fn() },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole("button", { name: "Button" });
    await expect(button).toBeDisabled();
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const Fill: Story = { args: { variant: "fill" } };
export const Outline: Story = { args: { variant: "outline" } };
export const Soft: Story = { args: { variant: "soft" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const LinkVariant: Story = { args: { variant: "link" } };

export const Primary: Story = { args: { color: "primary" } };
export const Secondary: Story = { args: { color: "secondary" } };
export const Success: Story = { args: { color: "success" } };
export const Danger: Story = { args: { color: "danger" } };

export const Small: Story = { args: { size: "sm" } };
export const Medium: Story = { args: { size: "md" } };
export const Large: Story = { args: { size: "lg" } };

/** Every variant × every intent (the compound classes). */
export const VariantsByIntent: Story = {
  render: (args) => (
    <Stack gap={3}>
      {variants.map((variant) => (
        <Flex key={variant} wrap gap={2}>
          {buttonIntents.map((color) => (
            <Button key={color} {...args} variant={variant} color={color}>
              {variant} {color}
            </Button>
          ))}
        </Flex>
      ))}
    </Stack>
  ),
};

/** Every size, side by side. */
export const Sizes: Story = {
  render: (args) => (
    <Flex align="center" gap={2}>
      {sizes.map((size) => (
        <Button key={size} {...args} size={size}>
          {size}
        </Button>
      ))}
    </Flex>
  ),
};

export const WithIcons: Story = { args: { prefix: "←", suffix: "→" } };

/** Icon only: the icon goes in `prefix`, there are no children, and `aria-label` names the button; no empty label span is rendered. */
export const IconOnly: Story = {
  args: { children: undefined, prefix: "×", "aria-label": "Close" },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Close" });
    await expect(button.children).toHaveLength(1);
  },
};

export const AsLink: Story = {
  args: { as: "a", href: "#top", variant: "link", children: "Link" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Link" })).toHaveAttribute(
      "href",
      "#top",
    );
  },
};
