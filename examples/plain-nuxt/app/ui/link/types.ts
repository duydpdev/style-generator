import type { linkTones } from "./style";

export interface LinkProps {
  as?: string;
  tone?: (typeof linkTones)[number];
  underline?: "always" | "hover" | "none";
}
