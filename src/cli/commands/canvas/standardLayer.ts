import { z } from "zod";

import { CanvasInputError, readJson } from "./scan";
import { DEFAULT_STANDARD, type Standard } from "./standardSchema";

/** A justification the user wrote: never empty, so a deviation always says why. */
const reason = z.string().trim().min(1, "must not be empty");
const positiveInt = z.number().int().positive();

const pageSchema = z.object({ id: z.string(), name: z.string() });
const boardSchema = z.object({
  file: z.string(),
  page: z.string(),
  title: z.string(),
});

/**
 * What a product may add to the packaged standard. It never redefines a rule,
 * a list or a board of the package: every key only appends or declares.
 */
export const AdditionsSchema = z.strictObject({
  $schema: z.string().optional(),
  /** Product colour roles beyond the packaged ones; an empty description is reported by the check. */
  roles: z.record(z.string(), z.object({ description: z.string() })).optional(),
  /** Extra steps of a closed scale family, each with the reason it is needed. */
  scaleSteps: z
    .record(z.string(), z.record(z.string(), z.object({ reason })))
    .optional(),
  /** Silences one rule for one name. */
  exemptions: z
    .array(z.object({ rule: z.string(), name: z.string(), reason }))
    .optional(),
  /** Tokens kept on purpose although nothing uses them yet. */
  reserved: z.record(z.string(), z.object({ reason })).optional(),
  exceptions: z
    .object({
      bypass: z
        .array(
          z.object({
            class: z.string(),
            files: z.array(z.string()),
            reason,
          }),
        )
        .optional(),
      contrast: z.array(z.object({ pair: z.string(), reason })).optional(),
    })
    .optional(),
  /** A rule switched off, honoured only with the reason written here. */
  disabledRules: z.record(z.string(), z.object({ reason })).optional(),
  /** The alpha steps the product's boards may use (`$key/<n>`). */
  alphaScale: z.array(positiveInt).optional(),
  /** Product boards and pages, appended after the packaged ones. */
  pages: z.array(pageSchema).optional(),
  boards: z.array(boardSchema).optional(),
  content: z
    .record(
      z.string(),
      z.object({
        sections: z.array(z.string()),
        literals: z.array(z.string()),
      }),
    )
    .optional(),
});

export type Additions = z.infer<typeof AdditionsSchema>;

/** The packaged standard with a product's additions applied. */
export type LayeredStandard = Standard &
  Pick<
    Additions,
    | "roles"
    | "scaleSteps"
    | "exemptions"
    | "reserved"
    | "exceptions"
    | "disabledRules"
    | "alphaScale"
  >;

/** A key that only a full copy of the packaged manifest carries. */
const FULL_COPY_KEYS = [
  "semanticCore",
  "grammar",
  "scales",
  "rules",
  "descriptions",
  "radius",
  "weights",
  "typeScale",
  "dsComponents",
  "primitiveBoards",
  "componentBoards",
  "sourceBoards",
  "provenanceBoard",
] as const;

/** The parts of a full copy that survive as additions. */
const FullCopySchema = z.looseObject({
  grammar: z.looseObject({ roles: z.array(z.string()).optional() }).optional(),
  pages: z.array(pageSchema).optional(),
  boards: z.array(boardSchema).optional(),
  content: AdditionsSchema.shape.content,
  alphaScale: z.array(positiveInt).optional(),
});

/** The notice printed once for a full copy. */
export const FULL_COPY_NOTICE =
  'canvas-standard.json is a full copy: rules from the package apply; run "style-gen canvas standard migrate"';

/**
 * Whether a parsed `--standard` file is a full copy of the manifest, not an additions file.
 * @param {unknown} raw - The parsed file
 * @returns {boolean} True when it holds any manifest-only key
 */
export function isFullCopy(raw: unknown): boolean {
  return (
    typeof raw === "object" &&
    raw !== null &&
    FULL_COPY_KEYS.some((key) => key in raw)
  );
}

/**
 * Converts a full copy into additions in memory: product roles (its roles the
 * package lacks, with an empty description), boards, pages and content the
 * package lacks, and `alphaScale`. Rules, lists and scales are dropped.
 * @param {unknown} raw - The parsed full copy
 * @param {Standard} base - The packaged standard
 * @returns {Additions} What the copy adds
 */
export function additionsFromFullCopy(raw: unknown, base: Standard): Additions {
  const copy = FullCopySchema.safeParse(raw);
  if (!copy.success) return {};
  const { grammar, pages, boards, content, alphaScale } = copy.data;
  const packagedRoles = new Set(base.grammar?.roles ?? []);
  const roleNames = (grammar?.roles ?? []).filter((r) => !packagedRoles.has(r));
  const packagedBoards = new Set(base.boards.map((b) => b.file));
  const productBoards = (boards ?? []).filter(
    (b) => !packagedBoards.has(b.file),
  );
  const packagedPages = new Set(base.pages.map((p) => p.id));
  const productPages = (pages ?? []).filter((p) => !packagedPages.has(p.id));
  const productContent = Object.fromEntries(
    Object.entries(content ?? {}).filter(([file]) => !packagedBoards.has(file)),
  );
  return {
    ...(roleNames.length > 0 && {
      roles: Object.fromEntries(roleNames.map((r) => [r, { description: "" }])),
    }),
    ...(productPages.length > 0 && { pages: productPages }),
    ...(productBoards.length > 0 && { boards: productBoards }),
    ...(Object.keys(productContent).length > 0 && { content: productContent }),
    ...(alphaScale !== undefined && { alphaScale }),
  };
}

/**
 * Applies additions to the packaged standard: lists are appended, records merged.
 * A rule, list, scale or board of the package is never removed or replaced.
 * @param {Standard} base - The packaged standard
 * @param {Additions} additions - A product's additions
 * @returns {LayeredStandard} The standard the check applies
 */
export function layerStandard(
  base: Standard,
  additions: Additions,
): LayeredStandard {
  const known = new Set(base.boards.map((b) => b.file));
  const knownPages = new Set(base.pages.map((p) => p.id));
  return {
    ...base,
    pages: [
      ...base.pages,
      ...(additions.pages ?? []).filter((p) => !knownPages.has(p.id)),
    ],
    boards: [
      ...base.boards,
      ...(additions.boards ?? []).filter((b) => !known.has(b.file)),
    ],
    content: {
      ...additions.content,
      ...base.content,
    },
    roles: additions.roles,
    scaleSteps: additions.scaleSteps,
    exemptions: additions.exemptions,
    reserved: additions.reserved,
    exceptions: additions.exceptions,
    disabledRules: additions.disabledRules,
    alphaScale: additions.alphaScale,
  };
}

/** A loaded `--standard`: the layered standard and the notices to print before the result. */
export interface LoadedStandard {
  standard: LayeredStandard;
  notices: string[];
}

/**
 * Reads a `--standard` file and layers it over the packaged standard (a full copy is converted, with a notice).
 * @param {string} file - Absolute path of the file
 * @param {string} label - The path as the user wrote it, for messages
 * @param {Standard} base - The packaged standard
 * @returns {LoadedStandard} The standard and any notices
 * @throws {CanvasInputError} `<label>: <path> <message>` for the first schema issue
 */
export function loadStandard(
  file: string,
  label: string,
  base: Standard = DEFAULT_STANDARD,
): LoadedStandard {
  const raw = readJson(file, label);
  if (isFullCopy(raw)) {
    return {
      standard: layerStandard(base, additionsFromFullCopy(raw, base)),
      notices: [FULL_COPY_NOTICE],
    };
  }
  const result = AdditionsSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join(".") ?? "";
    throw new CanvasInputError(
      `${label}: ${path === "" ? "(root)" : path} ${issue?.message ?? "invalid"}`,
    );
  }
  return { standard: layerStandard(base, result.data), notices: [] };
}
