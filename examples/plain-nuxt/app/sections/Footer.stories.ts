import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect, within } from "storybook/test";

import Footer from "./Footer.vue";

const meta = {
  title: "Sections/Footer",
  component: Footer,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { Footer },
    template: "<Footer />",
  }),
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Footer takes no props: the play check asserts the three links. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const nav = canvas.getByRole("navigation", { name: "Footer" });
    await expect(within(nav).getAllByRole("link")).toHaveLength(3);
  },
};
