import { createFlex } from "../Flex/Flex";

import type { StackDeps } from "./Stack.types";

export const createStack = (deps: StackDeps) => createFlex(deps, "column");
