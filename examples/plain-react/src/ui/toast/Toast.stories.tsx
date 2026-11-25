import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Toast } from "./Toast";

const meta = {
  title: "UI/Toast",
  component: Toast,
  args: { title: "Message sent", children: "We will email you a copy." },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A computed `<property>` of a probe that reads a theme variable directly. */
const probe = (
  host: HTMLElement,
  property: "backgroundColor" | "color",
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

/** It fades in from below when it mounts, on the `surface` colour, with `muted` description text. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const toast = canvas.getByRole("status");
    // The entry is a CSS transition from `@starting-style`: let it finish first.
    await Promise.all(toast.getAnimations().map((a) => a.finished));
    const style = getComputedStyle(toast);
    await expect(style.opacity).toBe("1");
    await expect(style.backgroundColor).toBe(
      probe(canvasElement, "backgroundColor", "var(--sg-color-surface)"),
    );
    await expect(
      getComputedStyle(canvas.getByText("We will email you a copy.")).color,
    ).toBe(probe(canvasElement, "color", "var(--sg-color-muted)"));
  },
};

/** Without a description, only the title renders. */
export const TitleOnly: Story = {
  args: { children: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status").childElementCount).toBe(1);
  },
};
