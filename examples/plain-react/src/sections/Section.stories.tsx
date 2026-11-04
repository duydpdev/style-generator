import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Container, Section } from "./Section";

const meta = {
  title: "Sections/Section",
  component: Section,
  parameters: { layout: "fullscreen" },
  args: { id: "hero", children: "Section content" },
} satisfies Meta<typeof Section>;

export default meta;
type Story = StoryObj<typeof meta>;

/** `<section id>` with vertical rhythm and the page column. */
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    await expect(canvasElement.querySelector("section")).toHaveAttribute(
      "id",
      args.id,
    );
  },
};

export const Hero: Story = { args: { id: "hero" } };
export const Features: Story = { args: { id: "features" } };
export const Pricing: Story = { args: { id: "pricing" } };
export const Cta: Story = { args: { id: "cta" } };

/** `Container` alone: the page column, centred, max 64rem. */
export const InContainer: Story = {
  render: (args) => <Container>{args.children}</Container>,
};
