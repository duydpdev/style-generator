import { createDesignTokens } from "@duydpdev/style-generator/tokens";

import themeJson from "./theme.json";

const { DesignTokens } = createDesignTokens(themeJson);

export { DesignTokens };

/** Type alias for the JSON theme — used with `ColorVariant<Theme>` etc. */
export type Theme = typeof themeJson;
