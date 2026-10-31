import { createFlex } from "../Flex/Flex";
import type { UiTokens } from "../shared/types";

import type { StackDeps } from "./Stack.types";

export const createStack = <W extends UiTokens>(deps: StackDeps) =>
  createFlex<W>(deps, "column", "Stack");
