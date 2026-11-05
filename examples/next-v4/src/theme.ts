import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import type { StyleGeneratorOptions } from "@duydpdev/style-generator/types";
import { createCn } from "@duydpdev/style-generator/ui";

import themeJson from "./theme/theme.json";

/** The theme; `typeof theme` feeds `ColorVariant<typeof theme>` in the ui folders. */
export const theme = themeJson;

/** Kept equal to style-gen.config.json (the CLI reads that file); check:plain-ui compares them. */
export const options = {
  coverage: { colors: { opacities: [10, 20, 50, 80] } },
} as const satisfies StyleGeneratorOptions;

/** Typed token arrays from the theme and `options`. */
export const tokens = createDesignTokens(themeJson, options).DesignTokens.Web;

/** clsx + a tailwind-merge that knows this theme's utilities. */
export const cn = createCn(tokens);
