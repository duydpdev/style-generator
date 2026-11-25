import { z } from "zod";

import defaultManifest from "../../canvas/design-canvas-standard.json";

import { CanvasInputError, readJson } from "./scan";

const pageSchema = z.object({ id: z.string(), name: z.string() });
const coreBoardSchema = z.object({
  file: z.string(),
  page: z.string(),
  title: z.string(),
});
const positiveInt = z.number().int().positive();
/** A suffix or state: one capitalised camelCase segment, so it is safe inside a RegExp. */
const segment = z.string().regex(/^[A-Z][a-z0-9]*$/);

/**
 * The design-canvas manifest. The keys of the 8.x manifest plus `dsComponents`
 * are required; every other rule input is optional and its rule is skipped
 * when the key is absent. Unknown keys are accepted and ignored, so a manifest
 * written for a later release still loads.
 */
export const StandardSchema = z.object({
  semanticCore: z.array(z.string()),
  /**
   * The v2 semantic colour grammar: neutral keys, core roles, the suffixes in
   * order, the states (always last) and the deprecated names with their v2
   * replacement. Absent: the grammar rule is skipped.
   */
  grammar: z
    .object({
      neutral: z.array(z.string()),
      roles: z.array(z.string()),
      suffixes: z.array(segment),
      states: z.array(segment).min(1),
      renames: z.record(z.string(), z.string()),
    })
    .optional(),
  radius: z.array(z.string()),
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

export type Standard = z.infer<typeof StandardSchema>;

/** The manifest bundled into the CLI (also emitted next to it for products to read). */
export const DEFAULT_STANDARD: Standard = StandardSchema.parse(defaultManifest);

/**
 * Reads and validates a `--standard` manifest.
 * @param {string} file - Absolute path of the manifest
 * @param {string} label - The path as the user wrote it, for messages
 * @returns {Standard} The validated manifest
 * @throws {CanvasInputError} `<label>: <path> <message>` for the first schema issue
 */
export function loadStandard(file: string, label: string): Standard {
  const result = StandardSchema.safeParse(readJson(file, label));
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const path = issue?.path.join(".") ?? "";
  throw new CanvasInputError(
    `${label}: ${path === "" ? "(root)" : path} ${issue?.message ?? "invalid"}`,
  );
}
