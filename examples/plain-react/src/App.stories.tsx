import type { Meta, StoryObj } from "@storybook/react-vite";

import { App } from "./App";

const meta = {
  title: "Pages/Landing",
  component: App,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof App>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
