import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import { createUi } from "@duydpdev/ui-react";

import { options } from "./style-gen.options";
import theme from "./theme/theme.json";

/** The site's token-typed components: one `createUi` call for the whole app (no preset-driven component yet, so `{}`). */
export const { Box } = createUi(
  createDesignTokens(theme, options).DesignTokens.Web,
  {},
);
