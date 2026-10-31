import { createUi } from "@duydpdev/ui-react";

import { presets } from "./ui-presets";
import { tokens } from "./ui-tokens";

/** The site's token-typed components: one `createUi` call for the whole app. */
export const { Box, Container, Flex, Grid, Stack, Text } = createUi(
  tokens,
  presets,
);
