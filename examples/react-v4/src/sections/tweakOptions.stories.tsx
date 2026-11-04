import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { Box, Flex, Text } from "../ui";

import {
  GEOMETRY_OPTS,
  SURFACE_OPTS,
  VOICE_OPTS,
  type Option,
} from "./tweakOptions";

/** One card per option: its swatch, name and meta line. */
const OptionList = ({ options }: { options: Option<string>[] }) => (
  <Flex wrap gap={4}>
    {options.map((option) => (
      <Box key={option.val} border="thin" borderColor="line" rounded="md" p={3}>
        {option.render()}
        <Text type="text14Regular">{option.name}</Text>
        <Text type="text12Mono" color="muted">
          {option.meta}
        </Text>
      </Box>
    ))}
  </Flex>
);

const meta = {
  title: "Sections/tweakOptions",
  component: OptionList,
} satisfies Meta<typeof OptionList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const VoiceOptions: Story = {
  args: { options: VOICE_OPTS },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Instrument Serif")).toBeInTheDocument();
  },
};
export const GeometryOptions: Story = { args: { options: GEOMETRY_OPTS } };
export const SurfaceOptions: Story = { args: { options: SURFACE_OPTS } };
