import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect } from "storybook/test";

import Pricing from "./Pricing.vue";

const meta = {
  title: "Sections/Pricing",
  component: Pricing,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { Pricing },
    template: "<Pricing />",
  }),
} satisfies Meta<typeof Pricing>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pricing takes no props: the play check asserts its landmark heading. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 2, name: "Free and MIT licensed" }),
    ).toHaveTextContent("Free and MIT licensed");
  },
};
