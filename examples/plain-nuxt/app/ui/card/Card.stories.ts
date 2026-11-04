import type { Meta, StoryObj } from "@storybook/vue3-vite";

import Card from "./Card.vue";
import type { CardProps } from "./types";

interface CardArgs extends CardProps {
  default?: string;
  "aria-label"?: string;
}

const meta = {
  title: "UI/Card",
  component: Card,
  render: (args) => ({
    components: { Card },
    setup() {
      return { args };
    },
    template: '<Card v-bind="args">{{ args.default }}</Card>',
  }),
  args: { default: "Card content" },
} satisfies Meta<CardArgs>;

export default meta;
type Story = StoryObj<CardArgs>;

export const Default: Story = {
  args: { tone: "surface", padding: "md", radius: "lg", shadow: "sm" },
};

export const Surface: Story = {
  args: {
    tone: "surface",
    default: "The default card.",
  },
};
export const Muted: Story = {
  args: {
    tone: "muted",
    default: "Sits on the page background.",
  },
};
export const Outline: Story = {
  args: {
    tone: "outline",
    default: "Transparent with a muted border.",
  },
};

export const PaddingNone: Story = { args: { padding: "none" } };
export const PaddingSmall: Story = { args: { padding: "sm" } };
export const PaddingMedium: Story = { args: { padding: "md" } };
export const PaddingLarge: Story = { args: { padding: "lg" } };

export const RadiusSmall: Story = { args: { radius: "sm" } };
export const RadiusMedium: Story = { args: { radius: "md" } };
export const RadiusLarge: Story = { args: { radius: "lg" } };
export const RadiusPill: Story = { args: { radius: "pill" } };

export const ShadowNone: Story = { args: { shadow: "none" } };
export const ShadowSmall: Story = { args: { shadow: "sm" } };
export const ShadowMedium: Story = { args: { shadow: "md" } };
export const ShadowLarge: Story = { args: { shadow: "lg" } };

export const BorderThin: Story = { args: { border: "thin" } };
export const BorderThick: Story = { args: { border: "thick" } };
export const BorderNone: Story = { args: { border: "none" } };

export const Flat: Story = {
  args: {
    shadow: "none",
    border: "none",
    tone: "muted",
    default: "No shadow, no border.",
  },
};

export const AsArticle: Story = {
  args: {
    as: "article",
    "aria-label": "Article card",
    default: "Rendered as an article element.",
  },
};
