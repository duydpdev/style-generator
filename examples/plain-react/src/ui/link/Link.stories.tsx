import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Flex } from "../flex";

import { Link } from "./Link";
import { linkTones } from "./style";

const meta = {
  title: "UI/Link",
  component: Link,
  args: { href: "#top", children: "Link" },
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The rendered anchor carries the `href` arg. */
export const Default: Story = {
  args: { tone: "primary", underline: "hover" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Link" })).toHaveAttribute(
      "href",
      "#top",
    );
  },
};

export const Primary: Story = { args: { tone: "primary" } };
export const Foreground: Story = { args: { tone: "foreground" } };
export const Muted: Story = { args: { tone: "muted" } };

/** Every tone side by side. */
export const Tones: Story = {
  render: (args) => (
    <Flex gap={4}>
      {linkTones.map((tone) => (
        <Link key={tone} {...args} tone={tone}>
          {tone}
        </Link>
      ))}
    </Flex>
  ),
};

export const UnderlineAlways: Story = { args: { underline: "always" } };
export const UnderlineHover: Story = { args: { underline: "hover" } };
export const UnderlineNone: Story = { args: { underline: "none" } };

export const AsButton: Story = {
  args: {
    as: "button",
    type: "button",
    href: undefined,
    children: "Button that looks like a link",
  },
  play: async ({ canvas }) => {
    const el = canvas.getByRole("button", {
      name: "Button that looks like a link",
    });
    await expect(el.tagName).toBe("BUTTON");
    await expect(el).not.toHaveAttribute("href");
    await expect(el).toHaveAttribute("type", "button");
  },
};
