import type { Meta, StoryObj } from "@storybook/react";

import { Card } from "./Card";

const meta = {
  title: "UI/Card",
  component: Card,
  args: { children: "Card content" },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { tone: "surface", padding: "md", radius: "lg", shadow: "sm" },
};

export const Surface: Story = {
  args: { tone: "surface", children: "The default card." },
};
export const Muted: Story = {
  args: { tone: "muted", children: "Sits on the page background." },
};
export const Outline: Story = {
  args: { tone: "outline", children: "Transparent with a muted border." },
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
    children: "No shadow, no border.",
  },
};

export const AsArticle: Story = {
  args: {
    as: "article",
    "aria-label": "Article card",
    children: "Rendered as an article element.",
  },
};
