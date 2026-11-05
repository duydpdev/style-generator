import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { tokens } from "../../theme";
import { Box } from "../box";

import { Stack } from "./Stack";

const ITEM = { backgroundColor: "surface", rounded: "sm", p: 2 } as const;
const items = ["One", "Two", "Three"].map((label) => (
  <Box key={label} {...ITEM}>
    {label}
  </Box>
));

const meta = {
  title: "UI/Stack",
  component: Stack,
  args: { gap: 2, children: items },
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { direction: "column" } };
export const Row: Story = { args: { direction: "row" } };

export const AlignStart: Story = { args: { align: "start" } };
export const Centered: Story = { args: { align: "center" } };
export const AlignEnd: Story = { args: { align: "end" } };
export const AlignStretch: Story = { args: { align: "stretch" } };

export const JustifyStart: Story = {
  args: { justify: "start", minHeight: 240 },
};
export const JustifyCenter: Story = {
  args: { justify: "center", minHeight: 240 },
};
export const JustifyEnd: Story = { args: { justify: "end", minHeight: 240 } };
export const SpaceBetween: Story = {
  args: { justify: "between", minHeight: 240 },
};

export const Wrapped: Story = {
  args: {
    direction: "row",
    wrap: true,
    children: Array.from({ length: 12 }, (_, index) => (
      <Box key={index} {...ITEM}>
        {index + 1}
      </Box>
    )),
  },
};

/** Gap per breakpoint: `gap={{ base: 1, md: 3, lg: 6 }}`. */
export const ResponsiveGap: Story = {
  args: { gap: { base: 1, md: 3, lg: 6 } },
};

/** The computed `background-color` of a probe that reads the `primary` token directly. */
const tokenColor = (host: HTMLElement): string => {
  const probe = host.ownerDocument.createElement("span");
  probe.style.backgroundColor = "var(--sg-color-primary)";
  host.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
};
/** The alpha tail of a computed colour for a `/step` modifier. */
const alpha = (step: number): string => `/ ${String(step / 100)})`;

/** `primary/<step>` with the literal step type kept, so it type-checks as a colour value. */
function primaryStep<S extends (typeof tokens.opacities)[number]>(
  step: S,
): `primary/${S}`;
function primaryStep(step: number): string {
  return `primary/${String(step)}`;
}

const FIRST_STEP = tokens.opacities.at(0);
if (FIRST_STEP === undefined) throw new Error("no opacity step");

/** `divideColor`: the plain token and `token/step`, read from the first child's separator colour. */
export const DivideColors: Story = {
  render: () => (
    <Stack gap={2}>
      <Stack divideColor="primary" aria-label="divide=primary">
        {items}
      </Stack>
      <Stack
        divideColor={primaryStep(FIRST_STEP)}
        aria-label={`divide=primary/${String(FIRST_STEP)}`}
      >
        {items}
      </Stack>
    </Stack>
  ),
  play: async ({ canvas, canvasElement }) => {
    const plain = canvas.getByLabelText("divide=primary").firstElementChild;
    const step = canvas.getByLabelText(
      `divide=primary/${String(FIRST_STEP)}`,
    ).firstElementChild;
    if (plain === null || step === null) throw new Error("no divided child");
    await expect(getComputedStyle(plain).borderBottomColor).toBe(
      tokenColor(canvasElement),
    );
    await expect(
      getComputedStyle(step).borderBottomColor.endsWith(alpha(FIRST_STEP)),
    ).toBe(true);
  },
};
