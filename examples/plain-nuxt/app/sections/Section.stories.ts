import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect } from "storybook/test";

import Container from "./Container.vue";
import Section from "./Section.vue";

const meta = {
  title: "Sections/Section",
  component: Section,
  parameters: { layout: "fullscreen" },
  render: (args) => ({
    components: { Section },
    setup() {
      return { args };
    },
    template: '<Section v-bind="args">{{ args.default }}</Section>',
  }),
  args: {
    id: "hero",
    default: "Section content",
  },
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
  render: (args) => ({
    components: { Container },
    setup() {
      return { args };
    },
    template: '<Container v-bind="args">{{ args.default }}</Container>',
  }),
};
