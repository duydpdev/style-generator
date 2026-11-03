import type { Meta, StoryObj } from "@storybook/react-vite";

import { Link } from "./Link";
import { linkTones } from "./style";

const meta = {
  title: "UI/Link",
  component: Link,
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tones: Story = {
  render: () => (
    <div className="flex gap-4">
      {linkTones.map((tone) => (
        <Link key={tone} href="#" tone={tone}>
          {tone}
        </Link>
      ))}
    </div>
  ),
};

export const Underline: Story = {
  render: () => (
    <div className="flex gap-4">
      <Link href="#" underline="always">
        always
      </Link>
      <Link href="#" underline="hover">
        hover
      </Link>
      <Link href="#" underline="none">
        none
      </Link>
    </div>
  ),
};

export const AsButton: Story = {
  render: () => (
    <Link as="button" type="button">
      Button that looks like a link
    </Link>
  ),
};
