import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card } from "./Card";

const meta = {
  title: "UI/Card",
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Surface: Story = {
  render: () => (
    <Card tone="surface">
      <strong>Surface</strong>
      <p>The default card.</p>
    </Card>
  ),
};

export const Muted: Story = {
  render: () => (
    <Card tone="muted">
      <strong>Muted</strong>
      <p>Sits on the page background.</p>
    </Card>
  ),
};

export const Outline: Story = {
  render: () => (
    <Card tone="outline">
      <strong>Outline</strong>
      <p>Transparent with a muted border.</p>
    </Card>
  ),
};

export const Paddings: Story = {
  render: () => (
    <div className="flex flex-wrap items-start gap-4">
      {(["none", "sm", "md", "lg"] as const).map((padding) => (
        <Card key={padding} padding={padding}>
          {padding}
        </Card>
      ))}
    </div>
  ),
};

export const Flat: Story = {
  render: () => (
    <Card shadow="none" border="none" tone="muted">
      No shadow, no border.
    </Card>
  ),
};

export const AsArticle: Story = {
  render: () => (
    <Card as="article" aria-label="Article card">
      Rendered as an article element.
    </Card>
  ),
};
