import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Flex } from "../flex";

import { Avatar } from "./Avatar";

const meta = {
  title: "UI/Avatar",
  component: Avatar,
  args: { name: "Ada Lovelace", size: "md" },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A one-pixel PNG, so the story needs no network. */
const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/** A computed `<property>` of a probe that reads a theme variable directly. */
const probe = (
  host: HTMLElement,
  property: "backgroundColor" | "height",
  value: string,
): string => {
  const span = host.ownerDocument.createElement("span");
  span.style.display = "block";
  span.style[property] = value;
  host.append(span);
  const computed = getComputedStyle(span)[property];
  span.remove();
  return computed;
};

/** Without `src`: the initials on `secondarySubtle`, named by `name`. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const avatar = canvas.getByRole("img", { name: "Ada Lovelace" });
    await expect(avatar).toHaveTextContent("AL");
    await expect(getComputedStyle(avatar).backgroundColor).toBe(
      probe(
        canvasElement,
        "backgroundColor",
        "var(--sg-color-secondary-subtle)",
      ),
    );
  },
};

/** With `src`: the picture, its `alt` the name. */
export const Image: Story = {
  args: { src: PIXEL },
  play: async ({ canvas }) => {
    const image = canvas.getByRole("img", { name: "Ada Lovelace" });
    await expect(image.tagName).toBe("IMG");
  },
};

/** A picture that fails to load falls back to the initials. */
export const Broken: Story = {
  args: { src: "data:image/png;base64,broken" },
  play: async ({ canvas }) => {
    // The fallback renders after the browser reports the load error; `findBy` retries until then.
    const initials = await canvas.findByText("AL");
    await expect(initials.parentElement).toHaveAccessibleName("Ada Lovelace");
  },
};

/** An empty `src` (an API's `avatarUrl: ""`) is no picture: the initials show at once. */
export const EmptySrc: Story = {
  args: { src: "" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("img", { name: "Ada Lovelace" }),
    ).toHaveTextContent("AL");
  },
};

export const Small: Story = { args: { size: "sm" } };
export const Medium: Story = { args: { size: "md" } };
export const Large: Story = { args: { size: "lg" } };

/** Each size is its `controlHeight` token tall and as wide. */
export const Sizes: Story = {
  render: () => (
    <Flex gap={4} align="center">
      {(["sm", "md", "lg"] as const).map((size) => (
        <Avatar key={size} size={size} name={`Size ${size}`} />
      ))}
    </Flex>
  ),
  play: async ({ canvas, canvasElement }) => {
    for (const size of ["sm", "md", "lg"] as const) {
      const box = canvas
        .getByRole("img", { name: `Size ${size}` })
        .getBoundingClientRect();
      await expect(`${String(box.height)}px`).toBe(
        probe(canvasElement, "height", `var(--sg-control-${size})`),
      );
      await expect(box.width).toBe(box.height);
    }
  },
};
