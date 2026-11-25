import { tokens } from "../tokens";

import { createAvatarRecipe, type AvatarPreset } from "./factories/avatar";

/** Avatar roles: initials on `secondarySubtle`, a `pill` radius, one `controlHeight` key per size. */
export const avatarPreset = {
  fill: "secondarySubtle",
  text: "secondarySubtleForeground",
  radius: "pill",
  type: "text14Regular",
  size: { sm: "sm", md: "md", lg: "lg" },
} as const satisfies AvatarPreset;

/** `avatarRecipe({ slot, size })` → the class of the root or the image. */
export const avatarRecipe = createAvatarRecipe(tokens, avatarPreset);
