import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect } from "storybook/test";

import Features from "./Features.vue";

const meta = {
  title: "Sections/Features",
  component: Features,
  parameters: { layout: "fullscreen" },
  render: () => ({
    components: { Features },
    template: "<Features />",
  }),
} satisfies Meta<typeof Features>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Features takes no props: the play check asserts its landmark heading. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Everything comes from the theme",
    );
  },
};
