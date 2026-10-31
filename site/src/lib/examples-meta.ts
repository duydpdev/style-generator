import type { Variant } from "./example-files";

export interface VariantMeta {
  label: string;
  badge?: string;
  bundler: string;
}

/** Version switcher entries of the examples shell. */
export const META: Record<Variant, VariantMeta> = {
  v4: { label: "React + TW v4", bundler: "vite + react" },
};
