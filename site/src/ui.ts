import {
  createBox,
  createFlex,
  createGrid,
  createStack,
  createText,
} from "harness-example/ui";

import { tokens } from "./ui-tokens";

/** The site's components: the harness's sample factories bound to the site theme (no recipe presets). */
export const Box = createBox(tokens);
export const Flex = createFlex(tokens);
export const Grid = createGrid(tokens);
export const Stack = createStack(tokens);
export const Text = createText(tokens);
