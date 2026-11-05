import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect } from "storybook/test";

import { tokens } from "../../theme";

import Flex from "./Flex.vue";

import Box from "~/ui/box/Box.vue";
import Stack from "~/ui/stack/Stack.vue";

const items = ["One", "Two", "Three"];
const wrappedItems = Array.from({ length: 12 }, (_, index) => index + 1);

const meta = {
  title: "UI/Flex",
  component: Flex,
  render: (args) => ({
    components: { Flex, Box },
    setup() {
      return { args, items };
    },
    template: `
      <Flex v-bind="args">
        <Box v-for="item in items" :key="item" background-color="surface" rounded="sm" :p="2">
          {{ item }}
        </Box>
      </Flex>
    `,
  }),
  args: { gap: 2 },
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
  args: { wrap: true },
  render: (args) => ({
    components: { Flex, Box },
    setup() {
      return { args, wrappedItems };
    },
    template: `
      <Flex v-bind="args">
        <Box v-for="n in wrappedItems" :key="n" background-color="surface" rounded="sm" :p="2">
          {{ n }}
        </Box>
      </Flex>
    `,
  }),
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
  render: () => ({
    components: { Flex },
    setup() {
      return { GROW, SHRINK, BASIS: [...BASIS, ...BASIS_THIRDS] };
    },
    template: `
      <Flex :width="480" :gap="1">
        <Flex v-for="[v] in GROW" :key="String(v)" :grow="v" :aria-label="'grow=' + v">grow={{ v }}</Flex>
        <Flex v-for="[v] in SHRINK" :key="String(v)" :shrink="v" :aria-label="'shrink=' + v">shrink={{ v }}</Flex>
        <Flex v-for="[v] in BASIS" :key="String(v)" :basis="v" :aria-label="'basis=' + v">basis={{ v }}</Flex>
        <Flex aria-label="item=none">item=none</Flex>
      </Flex>
    `,
  }),
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
    // `grow`/`shrink` absent: Vue must not cast the missing boolean to `false`,
    // which would add `grow-0` / `shrink-0` (same computed value, wrong classes).
    const noneEl = canvas.getByLabelText("item=none");
    const none = getComputedStyle(noneEl);
    await expect(none.flexGrow).toBe("0");
    await expect(none.flexShrink).toBe("1");
    await expect(noneEl).not.toHaveClass("grow-0");
    await expect(noneEl).not.toHaveClass("shrink-0");
  },
};

/** `divideColor`: the plain token and `token/step`, read from the first child's separator colour. */
export const DivideColors: Story = {
  render: () => ({
    components: { Flex, Box, Stack },
    setup() {
      return { items, step: FIRST_STEP };
    },
    template: `
      <Stack :gap="2">
        <Flex divideColor="primary" aria-label="divide=primary">
          <Box v-for="item in items" :key="item" background-color="surface" rounded="sm" :p="2">{{ item }}</Box>
        </Flex>
        <Flex :divideColor="'primary/' + step" :aria-label="'divide=primary/' + step">
          <Box v-for="item in items" :key="item" background-color="surface" rounded="sm" :p="2">{{ item }}</Box>
        </Flex>
      </Stack>
    `,
  }),
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
