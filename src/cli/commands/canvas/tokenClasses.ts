/**
 * Classes against the theme's token families: one that names no token
 * (`ref-class`) and one that writes a raw value where a token exists
 * (`token-bypass`). Pure: the compile that decides `ref-class` is in `compileCss.ts`.
 */
import type { ClassUse } from "./classCandidates";
import {
  familiesOfUtility,
  splitClass,
  type Family,
  type FamilyClass,
} from "./boardInputs";

/** A bypass exception of the additions file. */
export interface BypassException {
  class: string;
  files: readonly string[];
}

/**
 * One use per file and class, at its first line.
 * @param {readonly ClassUse[]} uses - Every use
 * @returns {ClassUse[]} Distinct by file and candidate, in input order
 */
export function firstUses(uses: readonly ClassUse[]): ClassUse[] {
  const seen = new Set<string>();
  return uses.filter((use) => {
    const key = `${use.file}\0${use.candidate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const ARBITRARY = /^[[(]/;
// Zero (`z-0`, `opacity-0`, `border-0`) and full opacity name no design value.
const NEUTRAL = /^(?:0|100)$/;
const NUMERIC = /^\d+(?:\.\d+)?$/;
const COLORISH = /^\[(?:color:|#|rgb|hsl|oklch|oklab|lab|lch|color\()/i;

/**
 * The families a class picks a value of by name (`font-display`, not `font-[…]` or `opacity-50`).
 * @param {string} candidate - One class as written
 * @param {readonly Family[]} families - The families the theme defines
 * @returns {Family[]} Empty for any other class
 */
export function namedFamilies(
  candidate: string,
  families: readonly Family[],
): Family[] {
  return familiesOfUtility(splitClass(candidate).utility, families)
    .filter(
      ({ value }) =>
        value !== "" && !ARBITRARY.test(value) && !NUMERIC.test(value),
    )
    .map(({ family }) => family);
}

// Whether a value in one family is a raw value: an arbitrary value that reads
// no token (a colour value only counts for colours, any other for the non-colour family)or a bare number other than 0 and 100.
function isRaw({ family, value }: FamilyClass): boolean {
  if (value === "") return false;
  if (value.startsWith("["))
    return (
      !value.includes("var(--sg-") &&
      (family.key === "colors") === COLORISH.test(value)
    );
  return NUMERIC.test(value) && family.key !== "colors" && !NEUTRAL.test(value);
}

/**
 * The family whose token a class replaces with a raw value, if it does.
 * @param {string} candidate - One class as written
 * @param {readonly Family[]} families - The families the theme defines
 * @returns {Family | undefined} The family, or `undefined` for a class that reads a token or leaves every family
 */
export function bypassedFamily(
  candidate: string,
  families: readonly Family[],
): Family | undefined {
  return familiesOfUtility(splitClass(candidate).utility, families).find(isRaw)
    ?.family;
}

// `*` stays inside one path segment, `**` crosses them.
function globRegExp(pattern: string): RegExp {
  const source = pattern
    .split("**")
    .map((part) =>
      part
        .split("*")
        .map((chunk) => chunk.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
        .join("[^/]*"),
    )
    .join(".*");
  return new RegExp(`^${source}$`);
}

/**
 * Whether an exception covers a class in a file.
 * @param {readonly BypassException[]} exceptions - From the additions file
 * @param {ClassUse} use - The class use
 * @returns {boolean} `true` when `class` equals the class as written or its bare utility and a file pattern matches
 */
export function bypassExcepted(
  exceptions: readonly BypassException[],
  use: ClassUse,
): boolean {
  const { utility } = splitClass(use.candidate);
  return exceptions.some(
    (entry) =>
      (entry.class === use.candidate || entry.class === utility) &&
      entry.files.some((pattern) => globRegExp(pattern).test(use.file)),
  );
}
