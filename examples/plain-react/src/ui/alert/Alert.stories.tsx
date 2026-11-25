import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Stack } from "../stack";

import { Alert } from "./Alert";
import { alertIntents } from "./style";

const meta = {
  title: "UI/Alert",
  component: Alert,
  args: { title: "Saved", children: "Your changes are live." },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A computed `<property>` of a probe that reads a theme variable directly. */
const probe = (
  host: HTMLElement,
  property: "backgroundColor" | "borderTopColor" | "color",
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

/** `soft` by default: the `<intent>Subtle` fill with `<intent>SubtleForeground` text, announced politely. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    const alert = canvas.getByRole("status");
    await expect(alert).toHaveTextContent("SavedYour changes are live.");
    const style = getComputedStyle(alert);
    await expect(style.backgroundColor).toBe(
      probe(canvasElement, "backgroundColor", "var(--sg-color-primary-subtle)"),
    );
    await expect(style.color).toBe(
      probe(
        canvasElement,
        "color",
        "var(--sg-color-primary-subtle-foreground)",
      ),
    );
  },
};

export const Soft: Story = { args: { variant: "soft" } };

/** An `<intent>` border and text on the page background. */
export const Outline: Story = {
  args: { variant: "outline", color: "danger" },
  play: async ({ canvas, canvasElement }) => {
    const style = getComputedStyle(canvas.getByRole("status"));
    await expect(style.borderTopColor).toBe(
      probe(canvasElement, "borderTopColor", "var(--sg-color-danger)"),
    );
    await expect(style.color).toBe(
      probe(canvasElement, "color", "var(--sg-color-danger)"),
    );
  },
};

/** An `<intent>` fill with its `<intent>Foreground` text. */
export const Solid: Story = {
  args: { variant: "solid" },
  play: async ({ canvas, canvasElement }) => {
    const style = getComputedStyle(canvas.getByRole("status"));
    await expect(style.backgroundColor).toBe(
      probe(canvasElement, "backgroundColor", "var(--sg-color-primary)"),
    );
    await expect(style.color).toBe(
      probe(canvasElement, "color", "var(--sg-color-primary-foreground)"),
    );
  },
};

/** An intent without an `<intent>Foreground` key falls back to `background` text (`contrastText`). */
export const SolidFallback: Story = {
  args: { variant: "solid", color: "success" },
  play: async ({ canvas, canvasElement }) => {
    await expect(getComputedStyle(canvas.getByRole("status")).color).toBe(
      probe(canvasElement, "color", "var(--sg-color-background)"),
    );
  },
};

export const Primary: Story = { args: { color: "primary" } };
export const Secondary: Story = { args: { color: "secondary" } };
export const Success: Story = { args: { color: "success" } };
export const Danger: Story = { args: { color: "danger" } };

/** `role="alert"` for a message the user must hear at once. */
export const Assertive: Story = {
  args: { role: "alert", color: "danger", title: "Payment failed" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("Payment failed");
  },
};

/** Without `title`, only the message renders. */
export const NoTitle: Story = {
  args: { title: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status").childElementCount).toBe(0);
  },
};

/** Every intent in every variant. */
export const Grid: Story = {
  render: () => (
    <Stack gap={4}>
      {(["soft", "outline", "solid"] as const).flatMap((variant) =>
        alertIntents.map((color) => (
          <Alert
            key={`${variant}-${color}`}
            variant={variant}
            color={color}
            title={`${color} ${variant}`}
          >
            A message.
          </Alert>
        )),
      )}
    </Stack>
  ),
};
