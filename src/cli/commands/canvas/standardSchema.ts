import { existsSync, readFileSync } from "node:fs";

import { z } from "zod";

const pageSchema = z.object({ id: z.string(), name: z.string() });
const coreBoardSchema = z.object({
  file: z.string(),
  page: z.string(),
  title: z.string(),
});
const positiveInt = z.number().int().positive();
/** A suffix or state: one capitalised camelCase segment, so it is safe inside a RegExp. */
const segment = z.string().regex(/^[A-Z][a-z0-9]*$/);

/** What kind of value checks a scale family gets: `size` is ordered and unit-checked, `ordinal` only ordered, `name` only named. */
const scaleSchema = z.object({
  kind: z.enum(["size", "ordinal", "name"]),
  steps: z.array(z.string()),
});

/** Why a rule exists: a WCAG section, a verified precedent, a technical constraint or a library choice. */
const ruleSchema = z.object({
  basis: z.object({
    type: z.enum(["wcag", "precedent", "technical", "choice"]),
    source: z.string().optional(),
  }),
});

const manifestShape = z.object({
  semanticCore: z.array(z.string()),
  /** The v2 colour grammar; suffixes in order, states always last. */
  grammar: z
    .object({
      neutral: z.array(z.string()),
      roles: z.array(z.string()),
      suffixes: z.array(segment),
      states: z.array(segment).min(1),
      renames: z.record(z.string(), z.string()),
    })
    .optional(),
  /** Closed step names per token family; the family name is the theme field. */
  scales: z.record(z.string(), scaleSchema).optional(),
  /** Default usage sentence per semantic colour key. */
  descriptions: z.record(z.string(), z.string()).optional(),
  /** Rule id → why the rule exists; printed with each violation. */
  rules: z.record(z.string(), ruleSchema).optional(),
  /** The radius list of manifests before `scales`; read as `scales.borderRadius`. */
  radius: z.array(z.string()).optional(),
  weights: z.record(z.string(), segment),
  typeScale: z.array(z.number()),
  pages: z.array(pageSchema),
  boards: z.array(coreBoardSchema),
  componentBoards: z.object({
    page: z.string(),
    titlePrefix: z.string(),
    maxWidth: positiveInt.optional(),
    maxHeight: positiveInt.optional(),
    minPaddingSteps: positiveInt.optional(),
  }),
  /** Kebab-cased design-system component names: one `c-<name>` board each. */
  dsComponents: z.array(z.string()),
  primitiveBoards: z.array(z.string()),
  /** Page and file prefix of a component source board; turns on the component-page and frame rules. */
  sourceBoards: z.object({ page: z.string(), prefix: z.string() }).optional(),
  /** Core board → the `data-sg-section` ids and `data-sg-literal` theme paths it carries. */
  content: z
    .record(
      z.string(),
      z.object({
        sections: z.array(z.string()),
        literals: z.array(z.string()),
      }),
    )
    .optional(),
  /** Core board that carries the `data-sg-provenance="main"` block. */
  provenanceBoard: z.string().optional(),
});

/**
 * The design-canvas manifest: an absent optional key skips its rule, and
 * unknown keys are ignored so a manifest for a later release still loads.
 * A top-level `radius` list from an older manifest becomes `scales.borderRadius`.
 */
export const StandardSchema = manifestShape.transform(({ radius, ...rest }) => {
  if (radius === undefined || rest.scales?.borderRadius !== undefined) {
    return rest;
  }
  return {
    ...rest,
    scales: {
      ...rest.scales,
      borderRadius: { kind: "size" as const, steps: radius },
    },
  };
});

export type Standard = z.output<typeof StandardSchema>;

const MANIFEST_FILE = "design-canvas-standard.json";

/**
 * Reads the manifest emitted next to the CLI instead of inlining it, so its
 * descriptions and rule text do not count against the CLI bundle budget.
 * `dist/cli/index.mjs` finds it at `../canvas/`, the sources at `../../canvas/`.
 * @returns {unknown} The parsed manifest
 * @throws {Error} When neither layout holds the file
 */
function readPackagedManifest(): unknown {
  for (const dir of ["../canvas/", "../../canvas/"]) {
    const url = new URL(`${dir}${MANIFEST_FILE}`, import.meta.url);
    if (existsSync(url)) return JSON.parse(readFileSync(url, "utf8"));
  }
  throw new Error(`${MANIFEST_FILE} is missing from the installed package`);
}

/** The manifest shipped with the package (also readable by products at `dist/canvas/`). */
export const DEFAULT_STANDARD: Standard = StandardSchema.parse(
  readPackagedManifest(),
);
