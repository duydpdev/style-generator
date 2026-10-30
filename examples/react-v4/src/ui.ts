import { createUi } from "@duydpdev/ui-react";
import { presets as designPresets, tokens } from "design-system-example";

/** The roles this app renders; an omitted role is not returned by createUi. */
const presets = {
  box: designPresets.box,
  text: designPresets.text,
  button: designPresets.button,
};

/** The example's token-typed components: one `createUi` call for the whole app. */
export const { Box, Button, Container, Flex, Grid, Stack, Text } = createUi(
  tokens,
  presets,
);
