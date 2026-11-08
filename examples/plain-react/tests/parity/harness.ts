import {
  boxPreset,
  buttonPreset,
  textPreset,
  tokens,
} from "design-system-example";
import {
  createBox,
  createButton,
  createFlex,
  createGrid,
  createStack,
  createText,
} from "harness-example/ui";

/** The harness tokens and components, bound exactly as examples/harness/src/ui.ts binds them. */
export const harnessTokens = tokens;
export const HarnessBox = createBox(tokens, boxPreset);
export const HarnessButton = createButton(tokens, buttonPreset);
export const HarnessFlex = createFlex(tokens);
export const HarnessGrid = createGrid(tokens);
export const HarnessStack = createStack(tokens);
export const HarnessText = createText(tokens, textPreset);
