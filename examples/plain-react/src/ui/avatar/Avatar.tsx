import { useState, type JSX } from "react";

import { cn } from "../../theme";

import { avatarRecipe } from "./style";
import type { AvatarProps } from "./types";

/** The first letter of the first and the last word, upper-cased. */
const initials = (name: string): string => {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  // `Array.from` splits by code point, so a name starting with an astral character keeps it whole.
  const letter = (word: string | undefined) => Array.from(word ?? "")[0] ?? "";
  const first = letter(words[0]);
  const last = words.length > 1 ? letter(words.at(-1)) : "";
  return (first + last).toUpperCase();
};

/** `Avatar`: the picture at `src`, or the initials of `name` when there is none or it fails to load. */
export function Avatar({
  name,
  src,
  size,
  className,
  ...rest
}: AvatarProps): JSX.Element {
  const [failed, setFailed] = useState<string | undefined>();
  const root = cn(avatarRecipe({ slot: "root", size }), className) || undefined;
  // An empty `src` renders no attribute and fires no `error`, so it counts as no picture.
  if (src && src !== failed)
    return (
      <span {...rest} className={root}>
        <img
          src={src}
          alt={name}
          className={avatarRecipe({ slot: "image" })}
          onError={() => {
            setFailed(src);
          }}
        />
      </span>
    );
  return (
    <span {...rest} role="img" aria-label={name} className={root}>
      <span aria-hidden>{initials(name)}</span>
    </span>
  );
}
