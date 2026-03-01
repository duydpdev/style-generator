/**
 * Responsive value type: simple value or per-breakpoint object.
 * @example
 * // Simple: p={4}
 * // Responsive: p={{ base: 4, md: 8, lg: 12 }}
 */
export type ResponsiveValue<T> = T | Partial<Record<string, T>>;

/**
 * Resolve a single spacing prop into className + inline style CSS variables.
 * @param {string} prop - Spacing property name (e.g. 'p', 'mx', 'gap')
 * @param {ResponsiveValue<number>} value - Simple number or responsive object
 * @param {number} unit - Rem multiplier (default: 0.25, matching Tailwind's spacing scale)
 * @returns {{ className: string; style: Record<string, string> }} Resolved class name and CSS variable style map
 * @example
 * resolveSpacing('p', 4)
 * // → { className: 'sp-p', style: { '--sp-p': '1rem' } }
 * @example
 * resolveSpacing('p', { base: 4, md: 8, xl: 16 })
 * // → { className: 'sp-p', style: { '--sp-p': '1rem', '--sp-p-md': '2rem', '--sp-p-xl': '4rem' } }
 */
export const resolveSpacing = (
  prop: string,
  value: ResponsiveValue<number>,
  unit = 0.25,
): { className: string; style: Record<string, string> } => {
  const style: Record<string, string> = {};

  if (typeof value === "number") {
    style[`--sp-${prop}`] = `${String(value * unit)}rem`;
  } else {
    for (const [bp, val] of Object.entries(value)) {
      if (val == null) continue;
      const suffix = bp === "base" ? "" : `-${bp}`;
      style[`--sp-${prop}${suffix}`] = `${String(val * unit)}rem`;
    }
  }

  return { className: `sp-${prop}`, style };
};

/**
 * Resolve multiple spacing props at once.
 * @param {Record<string, ResponsiveValue<number> | undefined>} props - Object of spacing prop name → value
 * @returns {{ classNames: string[]; style: Record<string, string> }} Combined class names and merged CSS variable style map
 * @example
 * resolveSpacingProps({ p: 4, mx: { base: 2, md: 4 } })
 * // → {
 * //     classNames: ['sp-p', 'sp-mx'],
 * //     style: { '--sp-p': '1rem', '--sp-mx': '0.5rem', '--sp-mx-md': '1rem' }
 * //   }
 */
export const resolveSpacingProps = (
  props: Record<string, ResponsiveValue<number> | undefined>,
): { classNames: string[]; style: Record<string, string> } => {
  const classNames: string[] = [];
  const style: Record<string, string> = {};

  for (const [prop, value] of Object.entries(props)) {
    if (value == null) continue;
    const result = resolveSpacing(prop, value);
    classNames.push(result.className);
    Object.assign(style, result.style);
  }

  return { classNames, style };
};
