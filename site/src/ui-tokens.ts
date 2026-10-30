import { createDesignTokens } from "@duydpdev/style-generator/tokens";

import { options } from "./style-gen.options";
import theme from "./theme/theme.json";

/** The site's token arrays (`DesignTokens.Web`), read by `ui.ts` and `ui-presets.ts`. */
export const tokens = createDesignTokens(theme, options).DesignTokens.Web;
