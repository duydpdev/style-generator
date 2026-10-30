import { createUi } from "@duydpdev/ui-react";
import { presets, tokens } from "design-system-example";

/** The example's token-typed components: one `createUi` call with the design-system role presets. */
export const { Box } = createUi(tokens, presets);
