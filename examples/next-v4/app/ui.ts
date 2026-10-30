import { createUi } from "@duydpdev/ui-react";
import { tokens } from "design-system-example";

/**
 * The example's token-typed components: one `createUi` call for the whole app
 * (no preset-driven component yet, so `{}`). Next compiles the workspace
 * source of `@duydpdev/ui-react` through `transpilePackages` (`next.config.ts`).
 */
export const { Box } = createUi(tokens, {});
