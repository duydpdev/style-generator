import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent } from "storybook/test";

import { TweakGroup } from "./TweakGroup";
import { GEOMETRY_OPTS, SURFACE_OPTS, VOICE_OPTS } from "./tweakOptions";

const meta = {
  title: "Sections/TweakGroup",
  component: TweakGroup,
  args: {
    label: "Voice",
    sub: "typography pairing",
    options: VOICE_OPTS,
    active: "editorial",
    onPick: fn(),
  },
} satisfies Meta<typeof TweakGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The active option is pressed; picking another reports its value. */
export const Voice: Story = {
  play: async ({ args, canvas }) => {
    await expect(
      canvas.getByRole("button", { name: /Editorial/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(canvas.getByRole("button", { name: /Industrial/ }));
    await expect(args.onPick).toHaveBeenCalledTimes(1);
    await expect(args.onPick).toHaveBeenCalledWith("industrial");
  },
};

export const Geometry: Story = {
  args: {
    label: "Geometry",
    sub: "radius personality",
    options: GEOMETRY_OPTS,
    active: "soft",
  },
};

export const Surface: Story = {
  args: {
    label: "Surface",
    sub: "depth treatment",
    options: SURFACE_OPTS,
    active: "lifted",
  },
};
