import type { UiPresets } from "@duydpdev/ui-react";

import type { tokens } from "./ui-tokens";

/**
 * The site's role presets. The site renders only layout components today, so
 * no role is declared. Add a role (`button`, `card`, …) in the change that
 * first renders that component; an omitted role drops it from `createUi`.
 */
export const presets = {} as const satisfies UiPresets<typeof tokens>;
