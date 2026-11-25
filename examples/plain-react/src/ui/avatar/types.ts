import type { ComponentPropsWithRef } from "react";

export interface AvatarOwnProps {
  /** The person's name: the image's `alt`, the fallback's accessible name and its initials. */
  readonly name: string;
  /** The picture; the initials show when it is missing or fails to load. */
  readonly src?: string | undefined;
  /** The box, one `controlHeight` key tall and as wide. */
  readonly size?: "sm" | "md" | "lg" | undefined;
  readonly className?: string | undefined;
}

export type AvatarProps = AvatarOwnProps &
  Omit<
    ComponentPropsWithRef<"span">,
    keyof AvatarOwnProps | "role" | "children"
  >;
