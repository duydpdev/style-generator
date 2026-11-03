import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import { createCn } from "@duydpdev/style-generator/ui";

import themeJson from "./theme/theme.json";

/** The theme; `typeof theme` feeds `ColorVariant<typeof theme>` in the ui folders. */
export const theme = themeJson;

/** Typed token arrays; no options, like `styleGenVite` in vite.config.ts. */
export const tokens = createDesignTokens(themeJson).DesignTokens.Web;

/** clsx + a tailwind-merge that knows this theme's utilities. */
export const cn = createCn(tokens);
