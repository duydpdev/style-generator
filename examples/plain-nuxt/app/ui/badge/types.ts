import type { badgeIntents } from "./style";

export interface BadgeProps {
  as?: string;
  color?: (typeof badgeIntents)[number];
  variant?: "soft" | "solid" | "outline";
}
