import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, fn, userEvent } from "storybook/test";

import Button from "./Button.vue";
import { buttonIntents, buttonTables } from "./style";
import type { ButtonProps } from "./types";

import Flex from "~/ui/flex/Flex.vue";
import Stack from "~/ui/stack/Stack.vue";

type ButtonVariant = keyof typeof buttonTables.variants.variant;
type ButtonSize = keyof typeof buttonTables.variants.size;

const variants = Object.keys(buttonTables.variants.variant) as ButtonVariant[];
const sizes = Object.keys(buttonTables.variants.size) as ButtonSize[];

interface ButtonArgs extends ButtonProps {
  default?: string;
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
  href?: string;
  "aria-label"?: string;
  onClick?: (...args: unknown[]) => void;
}

const meta = {
  title: "UI/Button",
  component: Button,
  render: (args) => ({
    components: { Button },
    setup() {
      return { args };
    },
    template: `
      <Button v-bind="args">
        <template v-if="args.prefix" #prefix>{{ args.prefix }}</template>
        <template v-if="args.default" #default>{{ args.default }}</template>
        <template v-if="args.suffix" #suffix>{{ args.suffix }}</template>
      </Button>
    `,
  }),
  args: { default: "Button", onClick: fn() },
} satisfies Meta<ButtonArgs>;

export default meta;
type Story = StoryObj<ButtonArgs>;

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
  render: (args) => ({
    components: { Button, Flex, Stack },
    setup() {
      return { args, variants, buttonIntents };
    },
    template: `
      <Stack :gap="3">
        <Flex v-for="variant in variants" :key="variant" wrap :gap="2">
          <Button
            v-for="color in buttonIntents"
            :key="color"
            v-bind="args"
            :variant="variant"
            :color="color"
          >
            {{ variant }} {{ color }}
          </Button>
        </Flex>
      </Stack>
    `,
  }),
};

/** Every size, side by side. */
export const Sizes: Story = {
  render: (args) => ({
    components: { Button, Flex },
    setup() {
      return { args, sizes };
    },
    template: `
      <Flex align="center" :gap="2">
        <Button v-for="size in sizes" :key="size" v-bind="args" :size="size">
          {{ size }}
        </Button>
      </Flex>
    `,
  }),
};

export const WithIcons: Story = { args: { prefix: "←", suffix: "→" } };

/** Icon only: the icon goes in the `prefix` slot, the default slot is absent, and `aria-label` names the button; no empty label span is rendered. */
export const IconOnly: Story = {
  args: { default: undefined, prefix: "×", "aria-label": "Close" },
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Close" });
    await expect(button.children).toHaveLength(1);
  },
};

// An inline-level icon (FontAwesome's `.svg-inline--fa`, `<iconify-icon>`, a
// wrapping span) sits on the text baseline unless its slot centres it; a raw
// <svg> hides the bug because Tailwind's preflight makes svg a block.
const inlineIcon = `<span data-testid="icon" style="display:inline-block"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect width="16" height="16" /></svg></span>`;

/** Inline-level icons: centred at every size; icon-only buttons (no label, a `v-if`-false label or an empty `v-for`) are square with one child. */
export const InlineIcon: Story = {
  render: (args) => ({
    components: { Button, Flex },
    setup() {
      return { args, sizes };
    },
    template: `
      <Flex align="center" :gap="2">
        <Button v-for="size in sizes" :key="size" v-bind="args" :size="size">
          <template #prefix>${inlineIcon}</template>
          {{ size }}
        </Button>
        <Button v-for="size in sizes" :key="'icon-' + size" :size="size" :aria-label="'Close ' + size">
          <template #prefix>${inlineIcon}</template>
        </Button>
        <Button aria-label="Close hidden label">
          <template #prefix>${inlineIcon}</template>
          <span v-if="false">Label</span>
        </Button>
        <Button aria-label="Close empty list">
          <template #prefix>${inlineIcon}</template>
          <span v-for="item in []" :key="item">{{ item }}</span>
        </Button>
        <Button aria-label="Close hidden fragment">
          <template #prefix>${inlineIcon}</template>
          <template v-if="false"><span>Label</span> text</template>
        </Button>
        <Button aria-label="Close empty suffix">
          <template #prefix>${inlineIcon}</template>
          <template #suffix><span v-if="false">→</span></template>
        </Button>
      </Flex>
    `,
  }),
  play: async ({ canvas }) => {
    const centre = (r: DOMRect): { x: number; y: number } => ({
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
    });
    for (const button of canvas.getAllByRole("button")) {
      const box = button.getBoundingClientRect();
      const svg = button.querySelector("[data-testid=icon] svg");
      if (!svg) throw new Error("icon not rendered");
      const b = centre(box);
      const i = centre(svg.getBoundingClientRect());
      await expect(Math.abs(i.y - b.y)).toBeLessThanOrEqual(0.5);
      if (button.getAttribute("aria-label") === null) continue;
      await expect(button.children).toHaveLength(1);
      await expect(Math.abs(i.x - b.x)).toBeLessThanOrEqual(0.5);
      await expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(0.5);
    }
  },
};

/** Both icon slots and no label is not icon-only: two children and a button wider than it is tall (the `iconOnly` gate needs exactly one icon). */
export const BothIconsNoLabel: Story = {
  render: (args) => ({
    components: { Button },
    setup() {
      return { args };
    },
    template: `
      <Button v-bind="args" aria-label="Both">
        <template #prefix>${inlineIcon}</template>
        <template #suffix>${inlineIcon}</template>
      </Button>
    `,
  }),
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Both" });
    const box = button.getBoundingClientRect();
    await expect(button.children).toHaveLength(2);
    await expect(box.width).toBeGreaterThan(box.height);
  },
};

export const AsLink: Story = {
  args: {
    as: "a",
    href: "#top",
    variant: "link",
    default: "Link",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Link" })).toHaveAttribute(
      "href",
      "#top",
    );
  },
};
