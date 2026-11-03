export interface InputProps {
  /** Control height and text size; replaces the native `size` attribute. */
  size?: "sm" | "md" | "lg";
  /** `true` renders `aria-invalid="true"` (and the invalid border). */
  invalid?: boolean;
}
