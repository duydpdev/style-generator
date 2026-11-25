import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import {
  DrawerContent,
  DrawerDescription,
  DrawerOverlay,
  DrawerTitle,
} from "./Drawer";

const meta = {
  title: "UI/Drawer",
  component: DrawerContent,
  args: { "aria-labelledby": "drawer-title" },
  // The parts are `position: fixed`: each story gets its own frame in the docs page.
  parameters: { docs: { story: { inline: false, iframeHeight: 420 } } },
  render: (args) => (
    <>
      <DrawerOverlay />
      <DrawerContent {...args}>
        <DrawerTitle id="drawer-title">Filters</DrawerTitle>
        <DrawerDescription>
          Narrow the list by status and owner.
        </DrawerDescription>
      </DrawerContent>
    </>
  ),
} satisfies Meta<typeof DrawerContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A computed `zIndex` of a probe that reads a theme variable directly. */
const layer = (host: HTMLElement, value: string): string => {
  const span = host.ownerDocument.createElement("span");
  span.style.zIndex = value;
  host.append(span);
  const computed = getComputedStyle(span).zIndex;
  span.remove();
  return computed;
};

/** Every movement has ended: the panel sits at its edge. */
const settled = async (element: HTMLElement) => {
  await Promise.all(
    element.getAnimations().map((animation) => animation.finished),
  );
  return getComputedStyle(element);
};

/** `right` by default: a 20rem panel on the right edge, on the `modal` layer over the scrim on the `overlay` layer. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const drawer = canvas.getByRole("dialog", { name: "Filters" });
    await expect(drawer).toHaveAttribute("aria-modal", "true");
    const style = await settled(drawer);
    await expect(style.right).toBe("0px");
    await expect(style.width).toBe("320px");
    await expect(style.translate).toBe("none");
    await expect(style.zIndex).toBe(layer(canvasElement, "var(--sg-z-modal)"));
    await expect(
      getComputedStyle(drawer.previousElementSibling as HTMLElement).zIndex,
    ).toBe(layer(canvasElement, "var(--sg-z-overlay)"));
  },
};

export const Left: Story = {
  args: { side: "left" },
  play: async ({ canvas }) => {
    const style = await settled(canvas.getByRole("dialog"));
    await expect(style.left).toBe("0px");
    await expect(style.width).toBe("320px");
  },
};

/** `bottom` spans the width and stops at 80% of the viewport height. */
export const Bottom: Story = {
  args: { side: "bottom" },
  play: async ({ canvas }) => {
    const dialog = canvas.getByRole("dialog");
    const style = await settled(dialog);
    await expect(style.bottom).toBe("0px");
    await expect(style.left).toBe("0px");
    await expect(style.right).toBe("0px");
    // `80vh` resolves to a fraction of a pixel: compare numbers, not strings.
    await expect(Number.parseFloat(style.maxHeight)).toBeCloseTo(
      dialog.ownerDocument.documentElement.clientHeight * 0.8,
      1,
    );
  },
};
