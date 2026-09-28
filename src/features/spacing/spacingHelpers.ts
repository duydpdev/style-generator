import type { Breakpoint } from "../../core/Options";
import type { SpacingKey } from "../../shared/defaultOption";

/**
 * Mặc định các breakpoint chuẩn theo Option của thư viện
 */
export type DefaultBreakpointKeys = `${Breakpoint}`;

/**
 * Responsive value type: simple value or per-breakpoint object.
 * Generic `BKeys` cho phép dự án tuỳ biến breakpoint khi bọc type.
 * `base` mặc định luôn có sẵn độc lập. Typo trong breakpoint key là type
 * error — không có fallback `(string & {})`.
 * @example
 * // Simple: p={4}
 * // Responsive: p={{ base: 4, md: 8, lg: 12 }}
 * // Custom breakpoint (ở project React):
 * // type ResponsiveOptions<T> = ResponsiveValueStrict<T, 'tablet' | 'desktop'>;
 * @example
 * type P = ResponsiveValueStrict<number, "base" | "md">;
 * const ok: P = { base: 4, md: 8 };
 * // const bad: P = { typo: 4 }; // type error
 */
export type ResponsiveValueStrict<
  T,
  BKeys extends string = DefaultBreakpointKeys,
> = T | Partial<Record<BKeys | "base", T>>;

/**
 * Resolve a single spacing prop into className + inline style CSS variables.
 * @param {SpacingKey} prop - Spacing property name (e.g. 'p', 'mx', 'gap')
 * @param {ResponsiveValueStrict<number>} value - Simple number or responsive object
 * @param {number} unit - Rem multiplier (default: 0.25, matching Tailwind's spacing scale)
 * @returns {{ className: string; style: Record<string, string> }} Resolved class name and CSS variable style map
 * @example
 * resolveSpacing('p', 4)
 * // → { className: 'sp-p', style: { '--sg-sp-p': '1rem' } }
 * @example
 * resolveSpacing('p', { base: 4, md: 8, xl: 16 })
 * // → { className: 'sp-p', style: { '--sg-sp-p': '1rem', '--sg-sp-p-md': '2rem', '--sg-sp-p-xl': '4rem' } }
 */
export const resolveSpacing = (
  prop: SpacingKey,
  value: ResponsiveValueStrict<number>,
  unit = 0.25,
): { className: string; style: Record<string, string> } => {
  const style: Record<string, string> = {};

  if (typeof value === "number") {
    style[`--sg-sp-${prop}`] = `${String(value * unit)}rem`;
  } else {
    for (const [bp, val] of Object.entries(value)) {
      const suffix = bp === "base" ? "" : `-${bp}`;
      style[`--sg-sp-${prop}${suffix}`] = `${String(val * unit)}rem`;
    }
  }

  return { className: `sp-${prop}`, style };
};

/**
 * Resolve multiple spacing props at once.
 * @param {Partial<Record<SpacingKey, ResponsiveValueStrict<number>>>} props - Object of spacing prop name → value
 * @returns {{ classNames: string; style: Record<string, string> }} Combined class names (space-joined) and merged CSS variable style map
 * @example
 * resolveSpacingProps({ p: 4, mx: { base: 2, md: 4 } })
 * // → {
 * //     classNames: 'sp-p sp-mx',
 * //     style: { '--sg-sp-p': '1rem', '--sg-sp-mx': '0.5rem', '--sg-sp-mx-md': '1rem' }
 * //   }
 */
export const resolveSpacingProps = (
  props: Partial<Record<SpacingKey, ResponsiveValueStrict<number>>>,
): { classNames: string; style: Record<string, string> } => {
  const classNames: string[] = [];
  const style: Record<string, string> = {};

  for (const [prop, value] of Object.entries(props)) {
    const result = resolveSpacing(prop as SpacingKey, value);
    classNames.push(result.className);
    Object.assign(style, result.style);
  }

  return { classNames: classNames.join(" "), style };
};
