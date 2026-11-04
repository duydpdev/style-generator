import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect } from "storybook/test";

import Link from "./Link.vue";
import { linkTones } from "./style";
import type { LinkProps } from "./types";

import Flex from "~/ui/flex/Flex.vue";

interface LinkArgs extends LinkProps {
  default?: string;
  href?: string;
  type?: string;
}

const meta = {
  title: "UI/Link",
  component: Link,
  render: (args) => ({
    components: { Link },
    setup() {
      return { args };
    },
    template: '<Link v-bind="args">{{ args.default }}</Link>',
  }),
  args: { href: "#top", default: "Link" },
} satisfies Meta<LinkArgs>;

export default meta;
type Story = StoryObj<LinkArgs>;

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
  render: (args) => ({
    components: { Link, Flex },
    setup() {
      return { args, linkTones };
    },
    template: `
      <Flex :gap="4">
        <Link v-for="tone in linkTones" :key="tone" v-bind="args" :tone="tone">
          {{ tone }}
        </Link>
      </Flex>
    `,
  }),
};

export const UnderlineAlways: Story = { args: { underline: "always" } };
export const UnderlineHover: Story = { args: { underline: "hover" } };
export const UnderlineNone: Story = { args: { underline: "none" } };

export const AsButton: Story = {
  args: {
    as: "button",
    type: "button",
    href: undefined,
    default: "Button that looks like a link",
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
