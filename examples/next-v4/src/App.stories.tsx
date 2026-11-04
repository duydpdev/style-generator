import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { App } from "./App";

const meta = {
  title: "Pages/Landing",
  component: App,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof App>;

export default meta;
type Story = StoryObj<typeof meta>;

/** App takes no props: the play check asserts the page title and the four section ids. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Tokens in, a design system out.",
    );
    for (const id of ["hero", "features", "pricing", "cta"]) {
      await expect(canvasElement.querySelector(`#${id}`)).not.toBeNull();
    }
  },
};
