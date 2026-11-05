import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect } from "storybook/test";

import { tokens } from "../../theme";

import Stack from "./Stack.vue";

import Box from "~/ui/box/Box.vue";

const items = ["One", "Two", "Three"];
const wrappedItems = Array.from({ length: 12 }, (_, index) => index + 1);

const meta = {
  title: "UI/Stack",
  component: Stack,
  render: (args) => ({
    components: { Stack, Box },
    setup() {
      return { args, items };
    },
    template: `
      <Stack v-bind="args">
        <Box v-for="item in items" :key="item" background-color="surface" rounded="sm" :p="2">
          {{ item }}
        </Box>
      </Stack>
    `,
  }),
  args: { gap: 2 },
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
  args: { direction: "row", wrap: true },
  render: (args) => ({
    components: { Stack, Box },
    setup() {
      return { args, wrappedItems };
    },
    template: `
      <Stack v-bind="args">
        <Box v-for="n in wrappedItems" :key="n" background-color="surface" rounded="sm" :p="2">
          {{ n }}
        </Box>
      </Stack>
    `,
  }),
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

const FIRST_STEP = tokens.opacities.at(0);
if (FIRST_STEP === undefined) throw new Error("no opacity step");

/** `divideColor`: the plain token and `token/step`, read from the first child's separator colour. */
export const DivideColors: Story = {
  render: () => ({
    components: { Stack, Box },
    setup() {
      return { items, step: FIRST_STEP };
    },
    template: `
      <Stack :gap="2">
        <Stack divideColor="primary" aria-label="divide=primary">
          <Box v-for="item in items" :key="item" background-color="surface" rounded="sm" :p="2">{{ item }}</Box>
        </Stack>
        <Stack :divideColor="'primary/' + step" :aria-label="'divide=primary/' + step">
          <Box v-for="item in items" :key="item" background-color="surface" rounded="sm" :p="2">{{ item }}</Box>
        </Stack>
      </Stack>
    `,
  }),
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
