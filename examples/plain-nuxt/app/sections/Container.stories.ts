import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect } from "storybook/test";

import Container from "./Container.vue";

const meta = {
  title: "Sections/Container",
  component: Container,
  render: (args) => ({
    components: { Container },
    setup() {
      return { args };
    },
    template: '<Container v-bind="args">{{ args.default }}</Container>',
  }),
  args: { default: "Container content" },
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The page column: centred, max 64rem, side padding. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Container content")).toBeInTheDocument();
  },
};
