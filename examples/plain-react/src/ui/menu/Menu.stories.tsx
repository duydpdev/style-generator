import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent } from "storybook/test";

import { MenuContent, MenuItem, MenuSeparator } from "./Menu";

const meta = {
  title: "UI/Menu",
  component: MenuContent,
  args: { "aria-label": "Project actions" },
  render: (args) => (
    <MenuContent {...args}>
      <MenuItem>Rename</MenuItem>
      <MenuItem>Duplicate</MenuItem>
      <MenuItem disabled>Archive</MenuItem>
      <MenuSeparator />
      <MenuItem>Delete</MenuItem>
    </MenuContent>
  ),
} satisfies Meta<typeof MenuContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A computed `backgroundColor` of a probe that reads a theme variable directly. */
const fill = (host: HTMLElement, value: string): string => {
  const span = host.ownerDocument.createElement("span");
  span.style.backgroundColor = value;
  host.append(span);
  const computed = getComputedStyle(span).backgroundColor;
  span.remove();
  return computed;
};

/** A named `role="menu"` of `menuitem` buttons kept out of the tab order, split by a separator; a focused item takes the `primarySubtle` fill. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const menu = canvas.getByRole("menu", { name: "Project actions" });
    // The panel fades in from `opacity: 0` (`starting:`); it is visible once that ends.
    await Promise.all(
      menu.getAnimations().map((animation) => animation.finished),
    );
    await expect(menu).toBeVisible();
    const items = canvas.getAllByRole("menuitem");
    await expect(items.map((item) => item.textContent)).toEqual([
      "Rename",
      "Duplicate",
      "Archive",
      "Delete",
    ]);
    for (const item of items)
      await expect(item).toHaveAttribute("tabindex", "-1");
    await expect(canvas.getByRole("separator")).toBeVisible();
    const rename = canvas.getByRole("menuitem", { name: "Rename" });
    rename.focus();
    await userEvent.keyboard("{ArrowDown}{ArrowUp}");
    await expect(rename).toHaveFocus();
    // `transition-colors`: the fill eases in, so read it once the transition ends.
    await Promise.all(
      rename.getAnimations().map((animation) => animation.finished),
    );
    await expect(getComputedStyle(rename).backgroundColor).toBe(
      fill(canvasElement, "var(--sg-color-primary-subtle)"),
    );
  },
};

/** ArrowDown/ArrowUp wrap and skip a disabled item; Home and End jump to the ends. */
export const Keyboard: Story = {
  play: async ({ canvas }) => {
    const item = (name: string) => canvas.getByRole("menuitem", { name });
    item("Rename").focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(item("Duplicate")).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(item("Delete")).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(item("Rename")).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    await expect(item("Delete")).toHaveFocus();
    await userEvent.keyboard("{Home}");
    await expect(item("Rename")).toHaveFocus();
    await userEvent.keyboard("{End}");
    await expect(item("Delete")).toHaveFocus();
    await expect(item("Archive")).toBeDisabled();
  },
};
