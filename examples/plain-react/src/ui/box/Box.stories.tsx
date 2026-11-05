import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { tokens } from "../../theme";
import { Grid } from "../grid";
import { Stack } from "../stack";

import { Box } from "./Box";

const meta = {
  title: "UI/Box",
  component: Box,
  args: { children: "Box", p: 4, backgroundColor: "surface", rounded: "md" },
} satisfies Meta<typeof Box>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { p: 4 } };
/** Spacing per breakpoint: `p={{ base: 2, md: 4, lg: 8 }}`. */
export const ResponsiveSpacing: Story = {
  args: { p: { base: 2, md: 4, lg: 8 } },
};

/** Every colour token as `backgroundColor`. */
export const BackgroundColors: Story = {
  render: (args) => (
    <Grid columns={3} gap={2}>
      {tokens.colors.map((color) => (
        <Box key={color} {...args} backgroundColor={color} border="thin">
          {color}
        </Box>
      ))}
    </Grid>
  ),
};
/** Every colour token as `borderColor`. */
export const BorderColors: Story = {
  args: { border: "thick" },
  render: (args) => (
    <Grid columns={3} gap={2}>
      {tokens.colors.map((color) => (
        <Box key={color} {...args} borderColor={color}>
          {color}
        </Box>
      ))}
    </Grid>
  ),
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

/** The blur filter needs something behind the box, so it sits on a coloured strip. */
export const BackdropBlur: Story = {
  args: {
    backdropBlur: "md",
    style: {
      backgroundColor:
        "color-mix(in srgb, var(--sg-color-background) 40%, transparent)",
    },
  },
  render: (args) => (
    <Box backgroundColor="accent" p={6}>
      <Box {...args} />
    </Box>
  ),
};

/** `position` against a `relative` parent. */
export const Positioned: Story = {
  args: { position: "absolute", style: { top: 8, right: 8 } },
  render: (args) => (
    <Box
      position="relative"
      height={128}
      rounded="md"
      border="thin"
      borderColor="line"
    >
      <Box {...args} />
    </Box>
  ),
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

/** `primary/<step>` with the literal step type kept, so it type-checks as a colour value. */
function primaryStep<S extends (typeof tokens.opacities)[number]>(
  step: S,
): `primary/${S}`;
function primaryStep(step: number): string {
  return `primary/${String(step)}`;
}

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
  render: () => (
    <Stack gap={2}>
      {DISPLAY.map(([value]) => (
        <div key={value}>
          <Box display={value} aria-label={`display=${value}`}>
            {value}
          </Box>
        </div>
      ))}
      {OVERFLOW.map(([value]) => (
        <Box key={value} overflow={value} aria-label={`overflow=${value}`}>
          {value}
        </Box>
      ))}
      {Z_INDEX.map(([value]) => (
        <Box
          key={String(value)}
          zIndex={value}
          aria-label={`zIndex=${String(value)}`}
        >
          {String(value)}
        </Box>
      ))}
    </Stack>
  ),
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
  render: () => (
    <Stack gap={2}>
      {OPACITY.map(([value]) => (
        <Box
          key={value}
          opacity={value}
          aria-label={`opacity=${String(value)}`}
        >
          {String(value)}
        </Box>
      ))}
      {TRANSITION.map(([value]) => (
        <Box key={value} transition={value} aria-label={`transition=${value}`}>
          {value}
        </Box>
      ))}
      {VISIBILITY.map(([value]) => (
        <Box key={value} visibility={value} aria-label={`visibility=${value}`}>
          {value}
        </Box>
      ))}
    </Stack>
  ),
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
  render: () => (
    <Stack gap={2}>
      {CURSOR.map(([value]) => (
        <Box key={value} cursor={value} aria-label={`cursor=${value}`}>
          {value}
        </Box>
      ))}
      {POINTER_EVENTS.map(([value]) => (
        <Box
          key={value}
          pointerEvents={value}
          aria-label={`pointerEvents=${value}`}
        >
          {value}
        </Box>
      ))}
      {SELECT.map(([value]) => (
        <Box key={value} select={value} aria-label={`select=${value}`}>
          {value}
        </Box>
      ))}
    </Stack>
  ),
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
  render: () => (
    <Stack gap={2}>
      {ASPECT.map(([value]) => (
        <Box key={value} aspect={value} aria-label={`aspect=${value}`}>
          {value}
        </Box>
      ))}
      {OBJECT_FIT.map(([value]) => (
        <Box key={value} objectFit={value} aria-label={`objectFit=${value}`}>
          {value}
        </Box>
      ))}
    </Stack>
  ),
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
  render: () => (
    <Stack gap={2}>
      <Box aria-label="bg=primary" backgroundColor="primary">
        bg=primary
      </Box>
      {tokens.opacities.map((step) => (
        <Box
          key={step}
          aria-label={`bg=primary/${String(step)}`}
          backgroundColor={primaryStep(step)}
        >
          {`bg=primary/${String(step)}`}
        </Box>
      ))}
      <Box
        aria-label={`border=primary/${String(FIRST_STEP)}`}
        border="thin"
        borderColor={primaryStep(FIRST_STEP)}
      >
        border
      </Box>
      <Box aria-label="ring=primary" ringColor="primary">
        ring=primary
      </Box>
      <Box
        aria-label={`ring=primary/${String(FIRST_STEP)}`}
        ringColor={primaryStep(FIRST_STEP)}
      >
        ring
      </Box>
      <Box aria-label="outline=primary" outlineColor="primary">
        outline=primary
      </Box>
      <Box
        aria-label={`outline=primary/${String(FIRST_STEP)}`}
        outlineColor={primaryStep(FIRST_STEP)}
      >
        outline
      </Box>
    </Stack>
  ),
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
