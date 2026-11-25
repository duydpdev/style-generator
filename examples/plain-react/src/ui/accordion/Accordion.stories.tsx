import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent } from "storybook/test";

import { Accordion } from "./Accordion";

const meta = {
  title: "UI/Accordion",
  component: Accordion,
  args: {
    items: [
      { id: "shipping", title: "Shipping", content: "Two to four days." },
      { id: "returns", title: "Returns", content: "Thirty days, free." },
      { id: "warranty", title: "Warranty", content: "Two years." },
    ],
  },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

const details = (summary: HTMLElement): HTMLDetailsElement => {
  const element = summary.closest("details");
  if (element === null) throw new Error("no details");
  return element;
};

/** A click on a title opens its section; another click closes it. Several may be open. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const shipping = canvas.getByText("Shipping");
    const returns = canvas.getByText("Returns");
    await userEvent.click(shipping);
    await userEvent.click(returns);
    await expect(details(shipping).open).toBe(true);
    await expect(details(returns).open).toBe(true);
    await expect(canvas.getByText("Two to four days.")).toBeVisible();
    await userEvent.click(shipping);
    await expect(details(shipping).open).toBe(false);
  },
};

/** `exclusive`: opening one section closes the open one. */
export const Exclusive: Story = {
  args: { exclusive: true },
  play: async ({ canvas }) => {
    const shipping = canvas.getByText("Shipping");
    const returns = canvas.getByText("Returns");
    await userEvent.click(shipping);
    await userEvent.click(returns);
    await expect(details(returns).open).toBe(true);
    await expect(details(shipping).open).toBe(false);
  },
};

/** `defaultOpen` starts a section open. */
export const DefaultOpen: Story = {
  args: {
    items: [
      { id: "faq", title: "Question", content: "Answer.", defaultOpen: true },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Answer.")).toBeVisible();
  },
};
