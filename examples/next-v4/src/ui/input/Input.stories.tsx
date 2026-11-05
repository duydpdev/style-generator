import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent } from "storybook/test";

import { tokens } from "../../theme";
import { Stack } from "../stack";

import { Input } from "./Input";

const meta = {
  title: "UI/Input",
  component: Input,
  args: { "aria-label": "Input", placeholder: "Type here", size: "md" },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Typing updates the value. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Input" });
    await userEvent.type(input, "hello");
    await expect(input).toHaveValue("hello");
  },
};

export const Small: Story = {
  args: { size: "sm", "aria-label": "Small", placeholder: "Small" },
};
export const Medium: Story = {
  args: { size: "md", "aria-label": "Medium", placeholder: "Medium" },
};
export const Large: Story = {
  args: { size: "lg", "aria-label": "Large", placeholder: "Large" },
};

export const Disabled: Story = {
  args: { "aria-label": "Disabled", disabled: true, defaultValue: "Disabled" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("textbox", { name: "Disabled" }),
    ).toBeDisabled();
  },
};

export const ReadOnly: Story = {
  args: {
    "aria-label": "Read only",
    readOnly: true,
    defaultValue: "Read only",
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Read only" });
    await expect(input).toHaveAttribute("readonly");
    await userEvent.type(input, "x");
    await expect(input).toHaveValue("Read only");
  },
};

export const Invalid: Story = {
  args: { "aria-label": "Email", invalid: true, defaultValue: "not-an-email" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("textbox", { name: "Email" }),
    ).toHaveAttribute("aria-invalid", "true");
  },
};

/** `primary/<step>` with the literal step type kept, so it type-checks as a colour value. */
function primaryStep<S extends (typeof tokens.opacities)[number]>(
  step: S,
): `primary/${S}`;
function primaryStep(step: number): string {
  return `primary/${String(step)}`;
}

/** The computed `background-color` of a probe that reads a colour token directly. */
const tokenColor = (host: HTMLElement, key: string): string => {
  const probe = host.ownerDocument.createElement("span");
  probe.style.backgroundColor = `var(--sg-color-${key})`;
  host.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
};
/** The alpha tail of a computed colour for a `/step` modifier. */
const alpha = (step: number): string => `/ ${String(step / 100)})`;

const FIRST_STEP = tokens.opacities.at(0);
if (FIRST_STEP === undefined) throw new Error("no opacity step");

/** `placeholderColor`: no prop (default `muted`), a token and `token/step`, read from `::placeholder`. */
export const PlaceholderColors: Story = {
  render: () => (
    <Stack gap={2}>
      <Input aria-label="placeholder=default" placeholder="default" />
      <Input
        aria-label="placeholder=primary"
        placeholder="primary"
        placeholderColor="primary"
      />
      <Input
        aria-label={`placeholder=primary/${String(FIRST_STEP)}`}
        placeholder="primary step"
        placeholderColor={primaryStep(FIRST_STEP)}
      />
    </Stack>
  ),
  play: async ({ canvas, canvasElement }) => {
    const fallback = canvas.getByLabelText("placeholder=default");
    const primary = canvas.getByLabelText("placeholder=primary");
    const step = canvas.getByLabelText(
      `placeholder=primary/${String(FIRST_STEP)}`,
    );
    await expect(getComputedStyle(fallback, "::placeholder").color).toBe(
      tokenColor(canvasElement, "muted"),
    );
    await expect(getComputedStyle(primary, "::placeholder").color).toBe(
      tokenColor(canvasElement, "primary"),
    );
    await expect(
      getComputedStyle(step, "::placeholder").color.endsWith(alpha(FIRST_STEP)),
    ).toBe(true);
    // tailwind-merge dropped the default `muted` class in favour of the prop.
    await expect(primary).toHaveClass("placeholder-primary");
    await expect(primary).not.toHaveClass("placeholder-muted");
  },
};
