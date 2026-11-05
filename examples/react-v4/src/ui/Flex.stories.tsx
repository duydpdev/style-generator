import type { Meta, StoryObj } from "@storybook/react";
import { tokens } from "design-system-example";
import { expect } from "storybook/test";

import { Box, Flex, Stack } from "../ui";

const ITEM = { backgroundColor: "surface", rounded: "sm", p: 2 } as const;
const items = ["One", "Two", "Three"].map((label) => (
  <Box key={label} {...ITEM}>
    {label}
  </Box>
));

const meta = {
  title: "UI/Flex",
  component: Flex,
  args: { gap: 2, children: items },
} satisfies Meta<typeof Flex>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { direction: "row" } };
export const Column: Story = { args: { direction: "column" } };

export const AlignStart: Story = { args: { align: "start", minHeight: 80 } };
export const AlignCenter: Story = { args: { align: "center", minHeight: 80 } };
export const AlignEnd: Story = { args: { align: "end", minHeight: 80 } };
export const AlignStretch: Story = {
  args: { align: "stretch", minHeight: 80 },
};

export const JustifyStart: Story = { args: { justify: "start" } };
export const JustifyCenter: Story = { args: { justify: "center" } };
export const JustifyEnd: Story = { args: { justify: "end" } };
export const SpaceBetween: Story = { args: { justify: "between" } };

export const Wrapped: Story = {
  args: {
    wrap: true,
    children: Array.from({ length: 12 }, (_, index) => (
      <Box key={index} {...ITEM}>
        {index + 1}
      </Box>
    )),
  },
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

const GROW = [
  [true, "1"],
  [false, "0"],
] as const;
const SHRINK = [
  [true, "1"],
  [false, "0"],
] as const;
const BASIS = [
  [0, "0px"],
  ["auto", "auto"],
  ["full", "100%"],
  ["1/2", "50%"],
  ["1/4", "25%"],
  ["3/4", "75%"],
] as const;
const BASIS_THIRDS = [
  ["1/3", 33.3333],
  ["2/3", 66.6667],
] as const;

/** `grow`, `shrink` and `basis` on child Flex items, plus one child with none of the three. */
export const ItemValues: Story = {
  render: () => (
    <Flex width={480} gap={1}>
      {GROW.map(([value]) => (
        <Flex
          key={String(value)}
          grow={value}
          aria-label={`grow=${String(value)}`}
        >
          {`grow=${String(value)}`}
        </Flex>
      ))}
      {SHRINK.map(([value]) => (
        <Flex
          key={String(value)}
          shrink={value}
          aria-label={`shrink=${String(value)}`}
        >
          {`shrink=${String(value)}`}
        </Flex>
      ))}
      {[...BASIS, ...BASIS_THIRDS].map(([value]) => (
        <Flex
          key={String(value)}
          basis={value}
          aria-label={`basis=${String(value)}`}
        >
          {`basis=${String(value)}`}
        </Flex>
      ))}
      <Flex aria-label="item=none">item=none</Flex>
    </Flex>
  ),
  play: async ({ canvas }) => {
    for (const [value, expected] of GROW) {
      const el = canvas.getByLabelText(`grow=${String(value)}`);
      await expect(getComputedStyle(el).flexGrow).toBe(expected);
    }
    for (const [value, expected] of SHRINK) {
      const el = canvas.getByLabelText(`shrink=${String(value)}`);
      await expect(getComputedStyle(el).flexShrink).toBe(expected);
    }
    for (const [value, expected] of BASIS) {
      const el = canvas.getByLabelText(`basis=${String(value)}`);
      await expect(getComputedStyle(el).flexBasis).toBe(expected);
    }
    for (const [value, expected] of BASIS_THIRDS) {
      const el = canvas.getByLabelText(`basis=${value}`);
      const basis = getComputedStyle(el).flexBasis;
      await expect(basis.endsWith("%")).toBe(true);
      await expect(Math.abs(parseFloat(basis) - expected)).toBeLessThan(0.01);
    }
    const none = getComputedStyle(canvas.getByLabelText("item=none"));
    await expect(none.flexGrow).toBe("0");
    await expect(none.flexShrink).toBe("1");
  },
};

/** `divideColor`: the plain token and `token/step`, read from the first child's separator colour. */
export const DivideColors: Story = {
  render: () => (
    <Stack gap={2}>
      <Flex divideColor="primary" aria-label="divide=primary">
        {items}
      </Flex>
      <Flex
        divideColor={primaryStep(FIRST_STEP)}
        aria-label={`divide=primary/${String(FIRST_STEP)}`}
      >
        {items}
      </Flex>
    </Stack>
  ),
  play: async ({ canvas, canvasElement }) => {
    const plain = canvas.getByLabelText("divide=primary").firstElementChild;
    const step = canvas.getByLabelText(
      `divide=primary/${String(FIRST_STEP)}`,
    ).firstElementChild;
    if (plain === null || step === null) throw new Error("no divided child");
    await expect(getComputedStyle(plain).borderRightColor).toBe(
      tokenColor(canvasElement),
    );
    await expect(
      getComputedStyle(step).borderRightColor.endsWith(alpha(FIRST_STEP)),
    ).toBe(true);
  },
};
