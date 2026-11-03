import type { tokens } from "../../theme";

export interface CardProps {
  as?: string;
  tone?: "surface" | "muted" | "outline";
  padding?: "none" | "sm" | "md" | "lg";
  radius?: (typeof tokens)["borderRadius"][number];
  shadow?: (typeof tokens)["shadows"][number] | "none";
  border?: (typeof tokens)["borderWidth"][number] | "none";
}
