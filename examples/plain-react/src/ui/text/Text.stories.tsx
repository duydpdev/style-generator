import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { tokens } from "../../theme";
import { Box } from "../box";
import { Grid } from "../grid";

import { Text } from "./Text";

const meta = {
  title: "UI/Text",
  component: Text,
  args: { children: "The quick brown fox" },
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
  render: (args) => (
    <Grid columns={1} gap={2}>
      {tokens.typography.map((type) => (
        <Text key={type} {...args} type={type}>
          {type}
        </Text>
      ))}
    </Grid>
  ),
};

/** Every colour token as text colour. */
export const Colors: Story = {
  render: (args) => (
    <Grid columns={1} gap={1}>
      {tokens.colors.map((color) => (
        <Text key={color} {...args} color={color}>
          {color}
        </Text>
      ))}
    </Grid>
  ),
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
  render: (args) => (
    <Grid columns={1} gap={1}>
      {transforms.map((transform) => (
        <Text
          key={transform}
          {...args}
          transform={transform}
          data-testid={`transform-${transform}`}
        >
          Mixed Case Text
        </Text>
      ))}
      <Text {...args} transform="normalCase" data-testid="transform-normal">
        Mixed Case Text
      </Text>
    </Grid>
  ),
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
  render: (args) => (
    <Grid columns={1} gap={1}>
      <Text {...args} data-testid="upright">
        Upright
      </Text>
      <Text {...args} italic data-testid="italic">
        Italic
      </Text>
    </Grid>
  ),
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
  render: (args) => (
    <Box width={160}>
      <Text {...args} truncate data-testid="truncate">
        {LONG_TEXT}
      </Text>
    </Box>
  ),
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
  render: (args) => (
    <Box width={240}>
      <Text {...args} lineClamp={2} data-testid="clamped">
        {LONG_TEXT}
      </Text>
      <Text {...args} lineClamp="none" data-testid="unclamped">
        {LONG_TEXT}
      </Text>
    </Box>
  ),
  play: async ({ canvas }) => {
    const clamped = canvas.getByTestId("clamped").getBoundingClientRect();
    const unclamped = canvas.getByTestId("unclamped").getBoundingClientRect();
    await expect(clamped.height).toBeLessThan(unclamped.height);
  },
};

/** `wrap`: one row per value in a narrow box; the play check asserts the `text-*` class and the computed `textWrapMode` (only `nowrap` keeps long text on one line). */
export const Wrap: Story = {
  render: (args) => (
    <Grid columns={1} gap={1}>
      {wraps.map((wrap) => (
        <Box key={wrap} width={160}>
          <Text {...args} wrap={wrap} data-testid={`wrap-${wrap}`}>
            {LONG_TEXT}
          </Text>
        </Box>
      ))}
    </Grid>
  ),
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
  render: (args) => (
    <Grid columns={1} gap={1}>
      <Text {...args} color="primary" data-testid="solid">
        primary
      </Text>
      <Text {...args} color="primary/50" data-testid="half">
        primary/50
      </Text>
    </Grid>
  ),
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
