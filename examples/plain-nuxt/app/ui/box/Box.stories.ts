import type { Meta, StoryObj } from "@storybook/vue3-vite";
import { expect } from "storybook/test";
import type { StyleValue } from "vue";

import { tokens } from "../../theme";

import Box from "./Box.vue";
import type { BoxProps } from "./types";

import Grid from "~/ui/grid/Grid.vue";
import Stack from "~/ui/stack/Stack.vue";

interface BoxArgs extends BoxProps {
  default?: string;
  "aria-label"?: string;
  style?: StyleValue;
}

const meta = {
  title: "UI/Box",
  component: Box,
  render: (args) => ({
    components: { Box },
    setup() {
      return { args };
    },
    template: '<Box v-bind="args">{{ args.default }}</Box>',
  }),
  args: {
    default: "Box",
    p: 4,
    backgroundColor: "surface",
    rounded: "md",
  },
} satisfies Meta<BoxArgs>;

export default meta;
type Story = StoryObj<BoxArgs>;

export const Default: Story = { args: { p: 4 } };

/** Spacing per breakpoint: `p={{ base: 2, md: 4, lg: 8 }}`. */
export const ResponsiveSpacing: Story = {
  args: { p: { base: 2, md: 4, lg: 8 } },
};

/** Every colour token as `backgroundColor`. */
export const BackgroundColors: Story = {
  render: (args) => ({
    components: { Box, Grid },
    setup() {
      return { args, colors: tokens.colors };
    },
    template: `
      <Grid :columns="3" :gap="2">
        <Box v-for="color in colors" :key="color" v-bind="args" :background-color="color" border="thin">
          {{ color }}
        </Box>
      </Grid>
    `,
  }),
};

/** Every colour token as `borderColor`. */
export const BorderColors: Story = {
  args: { border: "thick" },
  render: (args) => ({
    components: { Box, Grid },
    setup() {
      return { args, colors: tokens.colors };
    },
    template: `
      <Grid :columns="3" :gap="2">
        <Box v-for="color in colors" :key="color" v-bind="args" :border-color="color">
          {{ color }}
        </Box>
      </Grid>
    `,
  }),
};

export const Bordered: Story = {
  args: { border: "thin", borderColor: "line" },
};
export const BorderX: Story = {
  args: { borderX: "thick", borderColor: "primary" },
};
export const BorderY: Story = {
  args: { borderY: "thick", borderColor: "primary" },
};
export const BorderTop: Story = {
  args: { borderT: "thick", borderColor: "primary" },
};
export const BorderBottom: Story = {
  args: { borderB: "thick", borderColor: "primary" },
};
export const BorderLeft: Story = {
  args: { borderL: "thick", borderColor: "primary" },
};
export const BorderRight: Story = {
  args: { borderR: "thick", borderColor: "primary" },
};
export const InnerBorder: Story = {
  args: { innerBorder: true, border: "thick", borderColor: "primary" },
};

export const RoundedTop: Story = {
  args: { rounded: undefined, roundedT: "lg" },
};
export const RoundedBottom: Story = {
  args: { rounded: undefined, roundedB: "lg" },
};
export const RoundedLeft: Story = {
  args: { rounded: undefined, roundedL: "lg" },
};
export const RoundedRight: Story = {
  args: { rounded: undefined, roundedR: "lg" },
};

export const Shadow: Story = { args: { shadow: "md" } };

/** The frosted surface needs something behind the box, so it sits on a coloured strip. */
export const BackdropBlur: Story = {
  args: {
    backdropBlur: "md",
    style: {
      backgroundColor:
        "color-mix(in srgb, var(--sg-color-background) 40%, transparent)",
    },
  },
  render: (args) => ({
    components: { Box },
    setup() {
      return { args };
    },
    template: `
      <Box background-color="accent" :p="6">
        <Box v-bind="args">{{ args.default }}</Box>
      </Box>
    `,
  }),
};

/** `position` against a `relative` parent. */
export const Positioned: Story = {
  args: { position: "absolute", style: { top: 8, right: 8 } },
  render: (args) => ({
    components: { Box },
    setup() {
      return { args };
    },
    template: `
      <Box position="relative" :height="128" rounded="md" border="thin" border-color="line">
        <Box v-bind="args">{{ args.default }}</Box>
      </Box>
    `,
  }),
};

/** `width`, `minHeight` and `maxWidth` become inline style. */
export const Sizes: Story = {
  args: { width: 240, minHeight: 80, maxWidth: "100%" },
};

export const AsSection: Story = {
  args: { as: "section", "aria-label": "Section box" },
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
/** The substituted token string of a custom property set from `var(--sg-color-primary)`. */
const tokenRaw = (host: HTMLElement): string => {
  const probe = host.ownerDocument.createElement("span");
  probe.style.setProperty("--probe", "var(--sg-color-primary)");
  host.append(probe);
  const value = getComputedStyle(probe).getPropertyValue("--probe").trim();
  probe.remove();
  return value;
};
/** The alpha tail of a computed colour for a `/step` modifier. */
const alpha = (step: number): string => `/ ${String(step / 100)})`;

const FIRST_STEP = tokens.opacities.at(0);
if (FIRST_STEP === undefined) throw new Error("no opacity step");

const DISPLAY = [
  ["block", "block"],
  ["inlineBlock", "inline-block"],
  ["inline", "inline"],
  ["flex", "flex"],
  ["inlineFlex", "inline-flex"],
  ["grid", "grid"],
  ["contents", "contents"],
  ["hidden", "none"],
] as const;
const OVERFLOW = [
  ["auto", "auto"],
  ["hidden", "hidden"],
  ["clip", "clip"],
  ["visible", "visible"],
  ["scroll", "scroll"],
] as const;
const Z_INDEX = [
  [0, "0"],
  [10, "10"],
  [20, "20"],
  [30, "30"],
  [40, "40"],
  [50, "50"],
  ["auto", "auto"],
] as const;
const OPACITY = [
  [0, "0"],
  [10, "0.1"],
  [20, "0.2"],
  [30, "0.3"],
  [40, "0.4"],
  [50, "0.5"],
  [60, "0.6"],
  [70, "0.7"],
  [80, "0.8"],
  [90, "0.9"],
  [100, "1"],
] as const;
const TRANSITION = [
  ["none", "none"],
  ["all", "all"],
  ["colors", "color, background-color"],
  ["opacity", "opacity"],
  ["shadow", "box-shadow"],
  ["transform", "transform"],
] as const;
const VISIBILITY = [
  ["visible", "visible"],
  ["invisible", "hidden"],
  ["collapse", "collapse"],
] as const;
const CURSOR = [
  ["auto", "auto"],
  ["default", "default"],
  ["pointer", "pointer"],
  ["notAllowed", "not-allowed"],
  ["grab", "grab"],
  ["grabbing", "grabbing"],
  ["text", "text"],
  ["move", "move"],
] as const;
const POINTER_EVENTS = [
  ["none", "none"],
  ["auto", "auto"],
] as const;
const SELECT = [
  ["none", "none"],
  ["text", "text"],
  ["all", "all"],
  ["auto", "auto"],
] as const;
const ASPECT = [
  ["auto", "auto"],
  ["square", "1 / 1"],
  ["video", "16 / 9"],
] as const;
const OBJECT_FIT = [
  ["contain", "contain"],
  ["cover", "cover"],
  ["fill", "fill"],
  ["none", "none"],
  ["scaleDown", "scale-down"],
] as const;

/**
 * `display`, `overflow` and `zIndex`, one labelled Box per value. Each
 * `display` Box sits in its own block wrapper: flex items are blockified
 * (`inline-block` computes as `block`), so a direct Stack child could not
 * prove the inline values.
 */
export const LayoutValues: Story = {
  render: () => ({
    components: { Box, Stack },
    setup() {
      return { DISPLAY, OVERFLOW, Z_INDEX };
    },
    template: `
      <Stack :gap="2">
        <div v-for="[v] in DISPLAY" :key="v">
          <Box :display="v" :aria-label="'display=' + v">{{ v }}</Box>
        </div>
        <Box v-for="[v] in OVERFLOW" :key="v" :overflow="v" :aria-label="'overflow=' + v">{{ v }}</Box>
        <Box v-for="[v] in Z_INDEX" :key="String(v)" :zIndex="v" :aria-label="'zIndex=' + v">{{ v }}</Box>
      </Stack>
    `,
  }),
  play: async ({ canvas }) => {
    for (const [value, expected] of DISPLAY) {
      const el = canvas.getByLabelText(`display=${value}`);
      await expect(getComputedStyle(el).display).toBe(expected);
    }
    for (const [value, expected] of OVERFLOW) {
      const el = canvas.getByLabelText(`overflow=${value}`);
      await expect(getComputedStyle(el).overflow).toBe(expected);
    }
    for (const [value, expected] of Z_INDEX) {
      const el = canvas.getByLabelText(`zIndex=${String(value)}`);
      await expect(getComputedStyle(el).zIndex).toBe(expected);
    }
  },
};

/** `opacity` (numbers), `transition` and `visibility`, one labelled Box per value. */
export const EffectValues: Story = {
  render: () => ({
    components: { Box, Stack },
    setup() {
      return { OPACITY, TRANSITION, VISIBILITY };
    },
    template: `
      <Stack :gap="2">
        <Box v-for="[v] in OPACITY" :key="String(v)" :opacity="v" :aria-label="'opacity=' + v">{{ v }}</Box>
        <Box v-for="[v] in TRANSITION" :key="v" :transition="v" :aria-label="'transition=' + v">{{ v }}</Box>
        <Box v-for="[v] in VISIBILITY" :key="v" :visibility="v" :aria-label="'visibility=' + v">{{ v }}</Box>
      </Stack>
    `,
  }),
  play: async ({ canvas }) => {
    for (const [value, expected] of OPACITY) {
      const el = canvas.getByLabelText(`opacity=${String(value)}`);
      await expect(getComputedStyle(el).opacity).toBe(expected);
    }
    for (const [value, expected] of TRANSITION) {
      const el = canvas.getByLabelText(`transition=${value}`);
      await expect(
        getComputedStyle(el).transitionProperty.startsWith(expected),
      ).toBe(true);
    }
    for (const [value, expected] of VISIBILITY) {
      const el = canvas.getByLabelText(`visibility=${value}`);
      await expect(getComputedStyle(el).visibility).toBe(expected);
    }
  },
};

/** `cursor`, `pointerEvents` and `select`, one labelled Box per value. */
export const InteractionValues: Story = {
  render: () => ({
    components: { Box, Stack },
    setup() {
      return { CURSOR, POINTER_EVENTS, SELECT };
    },
    template: `
      <Stack :gap="2">
        <Box v-for="[v] in CURSOR" :key="v" :cursor="v" :aria-label="'cursor=' + v">{{ v }}</Box>
        <Box v-for="[v] in POINTER_EVENTS" :key="v" :pointerEvents="v" :aria-label="'pointerEvents=' + v">{{ v }}</Box>
        <Box v-for="[v] in SELECT" :key="v" :select="v" :aria-label="'select=' + v">{{ v }}</Box>
      </Stack>
    `,
  }),
  play: async ({ canvas }) => {
    for (const [value, expected] of CURSOR) {
      const el = canvas.getByLabelText(`cursor=${value}`);
      await expect(getComputedStyle(el).cursor).toBe(expected);
    }
    for (const [value, expected] of POINTER_EVENTS) {
      const el = canvas.getByLabelText(`pointerEvents=${value}`);
      await expect(getComputedStyle(el).pointerEvents).toBe(expected);
    }
    for (const [value, expected] of SELECT) {
      const el = canvas.getByLabelText(`select=${value}`);
      await expect(getComputedStyle(el).userSelect).toBe(expected);
    }
  },
};

/** `aspect` and `objectFit`, one labelled Box per value. */
export const MediaValues: Story = {
  render: () => ({
    components: { Box, Stack },
    setup() {
      return { ASPECT, OBJECT_FIT };
    },
    template: `
      <Stack :gap="2">
        <Box v-for="[v] in ASPECT" :key="v" :aspect="v" :aria-label="'aspect=' + v">{{ v }}</Box>
        <Box v-for="[v] in OBJECT_FIT" :key="v" :objectFit="v" :aria-label="'objectFit=' + v">{{ v }}</Box>
      </Stack>
    `,
  }),
  play: async ({ canvas }) => {
    for (const [value, expected] of ASPECT) {
      const el = canvas.getByLabelText(`aspect=${value}`);
      await expect(getComputedStyle(el).aspectRatio).toBe(expected);
    }
    for (const [value, expected] of OBJECT_FIT) {
      const el = canvas.getByLabelText(`objectFit=${value}`);
      await expect(getComputedStyle(el).objectFit).toBe(expected);
    }
  },
};

/** `backgroundColor`, `borderColor`, `ringColor` and `outlineColor`: the plain token and `token/step`. */
export const ColorSteps: Story = {
  render: () => ({
    components: { Box, Stack },
    setup() {
      return { steps: tokens.opacities, first: FIRST_STEP };
    },
    template: `
      <Stack :gap="2">
        <Box aria-label="bg=primary" backgroundColor="primary">bg=primary</Box>
        <Box v-for="step in steps" :key="step" :aria-label="'bg=primary/' + step" :backgroundColor="'primary/' + step">bg=primary/{{ step }}</Box>
        <Box :aria-label="'border=primary/' + first" border="thin" :borderColor="'primary/' + first">border</Box>
        <Box aria-label="ring=primary" ringColor="primary">ring=primary</Box>
        <Box :aria-label="'ring=primary/' + first" :ringColor="'primary/' + first">ring</Box>
        <Box aria-label="outline=primary" outlineColor="primary">outline=primary</Box>
        <Box :aria-label="'outline=primary/' + first" :outlineColor="'primary/' + first">outline</Box>
      </Stack>
    `,
  }),
  play: async ({ canvas, canvasElement }) => {
    const bg = canvas.getByLabelText("bg=primary");
    await expect(getComputedStyle(bg).backgroundColor).toBe(
      tokenColor(canvasElement),
    );
    for (const step of tokens.opacities) {
      const el = canvas.getByLabelText(`bg=primary/${String(step)}`);
      await expect(
        getComputedStyle(el).backgroundColor.endsWith(alpha(step)),
      ).toBe(true);
    }
    const border = canvas.getByLabelText(
      `border=primary/${String(FIRST_STEP)}`,
    );
    await expect(
      getComputedStyle(border).borderTopColor.endsWith(alpha(FIRST_STEP)),
    ).toBe(true);
    const ring = canvas.getByLabelText("ring=primary");
    await expect(
      getComputedStyle(ring).getPropertyValue("--tw-ring-color").trim(),
    ).toBe(tokenRaw(canvasElement));
    const ringStep = canvas.getByLabelText(
      `ring=primary/${String(FIRST_STEP)}`,
    );
    await expect(
      getComputedStyle(ringStep)
        .getPropertyValue("--tw-ring-color")
        .includes(`${String(FIRST_STEP)}%`),
    ).toBe(true);
    const outline = canvas.getByLabelText("outline=primary");
    await expect(getComputedStyle(outline).outlineColor).toBe(
      tokenColor(canvasElement),
    );
    const outlineStep = canvas.getByLabelText(
      `outline=primary/${String(FIRST_STEP)}`,
    );
    await expect(
      getComputedStyle(outlineStep).outlineColor.endsWith(alpha(FIRST_STEP)),
    ).toBe(true);
  },
};
