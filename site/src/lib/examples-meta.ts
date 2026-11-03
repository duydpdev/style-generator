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

/** Copy-paste examples (no iframe): label and directory under `examples/`. */
export const PLAIN_EXAMPLES = [
  { label: "React + Vite", dir: "plain-react" },
  { label: "Next.js", dir: "next-v4" },
  { label: "Nuxt", dir: "plain-nuxt" },
] as const;
