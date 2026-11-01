import {
  createBox,
  createFlex,
  createGrid,
  createStack,
  createText,
} from "react-v4-example/ui";

import { tokens } from "./ui-tokens";

/** The site's components: react-v4's sample factories bound to the site theme (no recipe presets). */
export const Box = createBox(tokens);
export const Flex = createFlex(tokens);
export const Grid = createGrid(tokens);
export const Stack = createStack(tokens);
export const Text = createText(tokens);
