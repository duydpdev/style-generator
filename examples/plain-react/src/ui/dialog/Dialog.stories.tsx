import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Button } from "../button";
import { Flex } from "../flex";

import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
} from "./Dialog";

const meta = {
  title: "UI/Dialog",
  component: DialogContent,
  args: { "aria-labelledby": "dialog-title" },
  // The parts are `position: fixed`: each story gets its own frame in the docs page.
  parameters: { docs: { story: { inline: false, iframeHeight: 420 } } },
  render: (args) => (
    <>
      <DialogOverlay />
      <DialogContent {...args}>
        <DialogTitle id="dialog-title">Delete project</DialogTitle>
        <DialogDescription>
          The project and its deployments are removed for everyone.
        </DialogDescription>
        <Flex justify="end" gap={2}>
          <Button variant="outline">Cancel</Button>
          <Button color="danger">Delete</Button>
        </Flex>
      </DialogContent>
    </>
  ),
} satisfies Meta<typeof DialogContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A computed style property of a probe that reads a theme variable directly. */
const probe = (
  host: HTMLElement,
  property: "backdropFilter" | "color" | "zIndex",
  value: string,
): string => {
  const span = host.ownerDocument.createElement("span");
  span.style[property] = value;
  host.append(span);
  const computed = getComputedStyle(span)[property];
  span.remove();
  return computed;
};

/** A modal panel named by its title, on the `modal` layer over a blurred scrim on the `overlay` layer; both have faded in. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const dialog = canvas.getByRole("dialog", { name: "Delete project" });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    const overlay = dialog.previousElementSibling as HTMLElement;
    await expect(overlay).toHaveAttribute("aria-hidden", "true");
    // Both fade in from `opacity: 0` (`starting:`); an empty animation list would mean no fade.
    for (const element of [dialog, overlay])
      await expect(getComputedStyle(element).transitionProperty).toMatch(
        /opacity/u,
      );
    await Promise.all(
      [dialog, overlay].flatMap((element) =>
        element.getAnimations().map((animation) => animation.finished),
      ),
    );
    await expect(getComputedStyle(dialog).opacity).toBe("1");
    await expect(getComputedStyle(overlay).opacity).toBe("1");
    await expect(getComputedStyle(dialog).zIndex).toBe(
      probe(canvasElement, "zIndex", "var(--sg-z-modal)"),
    );
    await expect(getComputedStyle(overlay).zIndex).toBe(
      probe(canvasElement, "zIndex", "var(--sg-z-overlay)"),
    );
    await expect(getComputedStyle(overlay).backdropFilter).toBe(
      probe(
        canvasElement,
        "backdropFilter",
        "blur(var(--sg-backdrop-blur-sm))",
      ),
    );
    await expect(
      getComputedStyle(canvas.getByText(/removed for everyone/u)).color,
    ).toBe(probe(canvasElement, "color", "var(--sg-color-muted)"));
  },
};

/** `size` sets the panel's maximum width: `sm` 24rem, `md` 32rem, `lg` 42rem. */
export const Small: Story = {
  args: { size: "sm" },
  play: async ({ canvas }) => {
    await expect(getComputedStyle(canvas.getByRole("dialog")).maxWidth).toBe(
      "384px",
    );
  },
};

export const Medium: Story = {
  args: { size: "md" },
  play: async ({ canvas }) => {
    await expect(getComputedStyle(canvas.getByRole("dialog")).maxWidth).toBe(
      "512px",
    );
  },
};

export const Large: Story = {
  args: { size: "lg" },
  play: async ({ canvas }) => {
    await expect(getComputedStyle(canvas.getByRole("dialog")).maxWidth).toBe(
      "672px",
    );
  },
};

/** Content taller than the viewport stays inside it, 1rem from each edge, and scrolls in the panel. */
export const Tall: Story = {
  render: (args) => (
    <>
      <DialogOverlay />
      <DialogContent {...args}>
        <DialogTitle id="dialog-title">Terms of service</DialogTitle>
        {Array.from({ length: 40 }, (_, index) => (
          <DialogDescription key={index}>
            Section {index + 1}: the service is provided as it is.
          </DialogDescription>
        ))}
      </DialogContent>
    </>
  ),
  play: async ({ canvas }) => {
    const dialog = canvas.getByRole("dialog", { name: "Terms of service" });
    await Promise.all(
      dialog.getAnimations().map((animation) => animation.finished),
    );
    const viewport = dialog.ownerDocument.documentElement.clientHeight;
    const box = dialog.getBoundingClientRect();
    await expect(box.top).toBeGreaterThanOrEqual(15.5);
    await expect(box.bottom).toBeLessThanOrEqual(viewport - 15.5);
    await expect(dialog.scrollHeight).toBeGreaterThan(dialog.clientHeight);
    await expect(getComputedStyle(dialog).overflowY).toBe("auto");
  },
};
