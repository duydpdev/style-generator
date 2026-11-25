import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent } from "storybook/test";

import { Text } from "../text";

import { Tabs } from "./Tabs";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  args: {
    "aria-label": "Account",
    onValueChange: fn(),
    tabs: [
      { value: "profile", label: "Profile", panel: <Text>Profile panel</Text> },
      { value: "billing", label: "Billing", panel: <Text>Billing panel</Text> },
      { value: "team", label: "Team", panel: <Text>Team panel</Text> },
    ],
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A computed `color` of a probe that reads a theme variable directly. */
const probe = (host: HTMLElement, value: string): string => {
  const span = host.ownerDocument.createElement("span");
  span.style.color = value;
  host.append(span);
  const computed = getComputedStyle(span).color;
  span.remove();
  return computed;
};

/** The first tab is selected and in the tab order; a click selects another tab, shows its panel and colours it with `primarySelected`. */
export const Default: Story = {
  play: async ({ args, canvas, canvasElement }) => {
    const profile = canvas.getByRole("tab", { name: "Profile" });
    const billing = canvas.getByRole("tab", { name: "Billing" });
    await expect(profile).toHaveAttribute("aria-selected", "true");
    await expect(billing).toHaveAttribute("tabindex", "-1");
    await expect(canvas.getByRole("tabpanel")).toHaveTextContent(
      "Profile panel",
    );
    await userEvent.click(billing);
    await expect(billing).toHaveAttribute("aria-selected", "true");
    await expect(args.onValueChange).toHaveBeenCalledWith("billing");
    const panel = canvas.getByRole("tabpanel", { name: "Billing" });
    await expect(panel).toHaveTextContent("Billing panel");
    await Promise.all(billing.getAnimations().map((a) => a.finished));
    await expect(getComputedStyle(billing).color).toBe(
      probe(canvasElement, "var(--sg-color-primary-selected)"),
    );
    await expect(getComputedStyle(billing).borderBottomColor).toBe(
      probe(canvasElement, "var(--sg-color-primary-selected)"),
    );
  },
};

/** ArrowRight, ArrowLeft (both wrap), Home and End move the focus and select the tab. */
export const Keyboard: Story = {
  play: async ({ canvas }) => {
    const tab = (name: string) => canvas.getByRole("tab", { name });
    tab("Profile").focus();
    await userEvent.keyboard("{ArrowLeft}");
    await expect(tab("Team")).toHaveFocus();
    await expect(tab("Team")).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{ArrowRight}");
    await expect(tab("Profile")).toHaveFocus();
    await userEvent.keyboard("{End}");
    await expect(tab("Team")).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{Home}");
    await expect(tab("Profile")).toHaveAttribute("aria-selected", "true");
  },
};

/** `value` makes the app own the selection: a click only reports it. */
export const Controlled: Story = {
  args: { value: "team" },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("tab", { name: "Billing" }));
    await expect(args.onValueChange).toHaveBeenCalledWith("billing");
    await expect(canvas.getByRole("tab", { name: "Team" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  },
};

/** A value that names no tab (a typo, a removed tab, tabs that load later) selects the first tab, so the list stays in the tab order. */
export const UnknownValue: Story = {
  args: { defaultValue: "missing" },
  play: async ({ canvas }) => {
    const first = canvas.getByRole("tab", { name: "Profile" });
    await expect(first).toHaveAttribute("aria-selected", "true");
    await expect(first).toHaveAttribute("tabindex", "0");
    await expect(canvas.getByRole("tabpanel")).toHaveTextContent(
      "Profile panel",
    );
  },
};
