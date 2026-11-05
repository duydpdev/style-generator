import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect } from "storybook/test";

import { tokens } from "../../theme";

import Text from "./Text.vue";

import Box from "~/ui/box/Box.vue";
import Grid from "~/ui/grid/Grid.vue";

const meta = {
  title: "UI/Text",
  component: Text,
  render: (args) => ({
    components: { Text },
    setup() {
      return { args };
    },
    template: '<Text v-bind="args">{{ args.default }}</Text>',
  }),
  args: { default: "The quick brown fox" },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { type: "text16Medium", color: "foreground" },
};

export const Text12Mono: Story = { args: { type: "text12Mono" } };
export const Text14Regular: Story = { args: { type: "text14Regular" } };
export const Text16Medium: Story = { args: { type: "text16Medium" } };
export const Text20Semibold: Story = { args: { type: "text20Semibold" } };
export const Text32Bold: Story = { args: { type: "text32Bold" } };
export const Display56Serif: Story = { args: { type: "display56Serif" } };

/** Every typography token. */
export const TypeScale: Story = {
  render: (args) => ({
    components: { Text, Grid },
    setup() {
      return { args, typography: tokens.typography };
    },
    template: `
      <Grid :columns="1" :gap="2">
        <Text v-for="type in typography" :key="type" v-bind="args" :type="type">
          {{ type }}
        </Text>
      </Grid>
    `,
  }),
};

/** Every colour token as text colour. */
export const Colors: Story = {
  render: (args) => ({
    components: { Text, Grid },
    setup() {
      return { args, colors: tokens.colors };
    },
    template: `
      <Grid :columns="1" :gap="1">
        <Text v-for="color in colors" :key="color" v-bind="args" :color="color">
          {{ color }}
        </Text>
      </Grid>
    `,
  }),
};

export const AlignLeft: Story = { args: { align: "left" } };
export const AlignCenter: Story = { args: { align: "center" } };
export const AlignRight: Story = { args: { align: "right" } };

export const DecorationUnderline: Story = {
  args: { decoration: "underline" },
};
export const DecorationLineThrough: Story = {
  args: { decoration: "lineThrough" },
};
export const DecorationNone: Story = { args: { decoration: "none" } };

export const AlignAndDecoration: Story = {
  args: { align: "center", decoration: "underline" },
};

const LONG_TEXT =
  "The quick brown fox jumps over the lazy dog while five boxing wizards jump quickly and a sphinx of black quartz judges my vow";
const transforms = ["uppercase", "lowercase", "capitalize"] as const;
const wraps = ["wrap", "nowrap", "balance", "pretty"] as const;

/** `transform`: one row per value; the play check reads each computed `text-transform` (`normalCase` is `normal-case`, i.e. `none`, so it is read from the class). */
export const Transforms: Story = {
  render: (args) => ({
    components: { Text, Grid },
    setup() {
      return { args, transforms };
    },
    template: `
      <Grid :columns="1" :gap="1">
        <Text
          v-for="transform in transforms"
          :key="transform"
          v-bind="args"
          :transform="transform"
          :data-testid="'transform-' + transform"
        >
          Mixed Case Text
        </Text>
        <Text v-bind="args" transform="normalCase" data-testid="transform-normal">
          Mixed Case Text
        </Text>
      </Grid>
    `,
  }),
  play: async ({ canvas }) => {
    for (const transform of transforms) {
      await expect(
        getComputedStyle(canvas.getByTestId(`transform-${transform}`))
          .textTransform,
      ).toBe(transform);
    }
    await expect(canvas.getByTestId("transform-normal")).toHaveClass(
      "normal-case",
    );
  },
};

/** `italic`: the italic row is italic, the plain row is not. */
export const Italic: Story = {
  render: (args) => ({
    components: { Text, Grid },
    setup() {
      return { args };
    },
    template: `
      <Grid :columns="1" :gap="1">
        <Text v-bind="args" data-testid="upright">Upright</Text>
        <Text v-bind="args" italic data-testid="italic">Italic</Text>
      </Grid>
    `,
  }),
  play: async ({ canvas }) => {
    await expect(
      getComputedStyle(canvas.getByTestId("upright")).fontStyle,
    ).toBe("normal");
    await expect(getComputedStyle(canvas.getByTestId("italic")).fontStyle).toBe(
      "italic",
    );
  },
};

/** `truncate` in a narrow box: one nowrap line cut with an ellipsis, wider than its box. */
export const Truncate: Story = {
  render: (args) => ({
    components: { Text, Box },
    setup() {
      return { args, text: LONG_TEXT };
    },
    template: `
      <Box :width="160">
        <Text v-bind="args" truncate data-testid="truncate">{{ text }}</Text>
      </Box>
    `,
  }),
  play: async ({ canvas }) => {
    const text = canvas.getByTestId("truncate");
    const style = getComputedStyle(text);
    await expect(style.whiteSpace).toBe("nowrap");
    await expect(style.textOverflow).toBe("ellipsis");
    await expect(style.overflow).toBe("hidden");
    await expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
    await expect(text).not.toHaveClass("whitespace-pre-wrap");
  },
};

/** `lineClamp={2}` is shorter than the same text with `lineClamp="none"`. */
export const LineClamp: Story = {
  render: (args) => ({
    components: { Text, Box },
    setup() {
      return { args, text: LONG_TEXT };
    },
    template: `
      <Box :width="240">
        <Text v-bind="args" :line-clamp="2" data-testid="clamped">{{ text }}</Text>
        <Text v-bind="args" line-clamp="none" data-testid="unclamped">{{ text }}</Text>
      </Box>
    `,
  }),
  play: async ({ canvas }) => {
    const clamped = canvas.getByTestId("clamped").getBoundingClientRect();
    const unclamped = canvas.getByTestId("unclamped").getBoundingClientRect();
    await expect(clamped.height).toBeLessThan(unclamped.height);
  },
};

/** `wrap`: one row per value in a narrow box; the play check asserts the `text-*` class and the computed `textWrapMode` (only `nowrap` keeps long text on one line). */
export const Wrap: Story = {
  render: (args) => ({
    components: { Text, Grid, Box },
    setup() {
      return { args, wraps, text: LONG_TEXT };
    },
    template: `
      <Grid :columns="1" :gap="1">
        <Box v-for="wrap in wraps" :key="wrap" :width="160">
          <Text v-bind="args" :wrap="wrap" :data-testid="'wrap-' + wrap">{{ text }}</Text>
        </Box>
      </Grid>
    `,
  }),
  play: async ({ canvas }) => {
    for (const wrap of wraps) {
      const text = canvas.getByTestId(`wrap-${wrap}`);
      await expect(text).toHaveClass(`text-${wrap}`);
      await expect(getComputedStyle(text).textWrapMode).toBe(
        wrap === "nowrap" ? "nowrap" : "wrap",
      );
    }
  },
};

/** `color="primary/50"` mixes the token with transparent: its computed colour differs from `primary` and equals a probe that mixes the CSS variable directly. */
export const ColorOpacities: Story = {
  render: (args) => ({
    components: { Text, Grid },
    setup() {
      return { args };
    },
    template: `
      <Grid :columns="1" :gap="1">
        <Text v-bind="args" color="primary" data-testid="solid">primary</Text>
        <Text v-bind="args" color="primary/50" data-testid="half">primary/50</Text>
      </Grid>
    `,
  }),
  play: async ({ canvas, canvasElement }) => {
    const resolve = (value: string): string => {
      const probe = canvasElement.ownerDocument.createElement("span");
      probe.style.color = value;
      canvasElement.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const solid = getComputedStyle(canvas.getByTestId("solid")).color;
    const half = getComputedStyle(canvas.getByTestId("half")).color;
    await expect(solid).toBe(resolve("var(--sg-color-primary)"));
    await expect(half).toBe(
      resolve("color-mix(in oklab, var(--sg-color-primary) 50%, transparent)"),
    );
    await expect(half).not.toBe(solid);
    await expect(canvas.getByTestId("half")).toHaveClass("text-primary/50");
  },
};
