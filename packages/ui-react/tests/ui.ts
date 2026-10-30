import { presets, tokens } from "design-system-example";

import { createUi } from "../src";

export const ui = createUi(tokens, presets);
/** Same tokens, no box/text presets: the site's situation. */
export const bare = createUi(tokens, {
  ...presets,
  box: undefined,
  text: undefined,
});
/** Layout only: no control role. */
export const layoutOnly = createUi(tokens, {});
