import { createUi } from "@duydpdev/ui-react";
import { presets, tokens } from "design-system-example";

/**
 * The example's token-typed components: one `createUi` call with the
 * design-system role presets. Next compiles the workspace source of
 * `@duydpdev/ui-react` through `transpilePackages` (`next.config.ts`).
 */
export const { Box } = createUi(tokens, presets);
