import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "..", "..");
const read = (rel: string): string => readFileSync(join(repoRoot, rel), "utf8");

const DOCS = [
  "documents/components.md",
  "documents/vi/components.md",
  "documents/agent-contract.md",
  "documents/vi/agent-contract.md",
];

const AXES = {
  variant: ["solid", "soft", "outline", "ghost", "link"],
  size: ["sm", "md", "lg", "icon"],
};

/**
 * The text with one occurrence of `from` replaced; throws when `from` is absent, so a control cannot pass by editing nothing.
 * @param {string} text - The document
 * @param {string} from - The text to replace
 * @param {string} to - Its replacement
 * @returns {string} The edited document
 */
const mutate = (text: string, from: string, to: string): string => {
  if (!text.includes(from)) throw new Error(`control text not found: ${from}`);
  return text.replace(from, to);
};

/**
 * The `component-axes` table as axis → the code spans of its values cell.
 * @param {string} text - Markdown
 * @returns {Record<string, string[]>} One entry per row
 */
const axisTable = (text: string): Record<string, string[]> => {
  const start = text.indexOf("<!-- component-axes:start -->");
  const end = text.indexOf("<!-- component-axes:end -->");
  if (start === -1 || end < start) return {};
  const rows = text
    .slice(start, end)
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .slice(2);
  return Object.fromEntries(
    rows.map((row) => {
      const [axis = "", values = ""] = row.split("|").slice(1, -1);
      return [
        axis.trim().replace(/^`|`$/g, ""),
        [...values.matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? ""),
      ];
    }),
  );
};

/**
 * Every axis the standard fixes, compared with the table.
 * @param {string} text - Markdown
 * @returns {boolean} Whether the table lists exactly the fixed vocabulary
 */
const matchesStandard = (text: string): boolean => {
  const table = axisTable(text);
  return (
    "color" in table &&
    Object.entries(AXES).every(
      ([axis, values]) =>
        JSON.stringify(table[axis]) === JSON.stringify(values),
    )
  );
};

describe("component standard", () => {
  it.each(DOCS)(
    "%s lists the color axis, five variants and four sizes",
    (rel) => {
      const table = axisTable(read(rel));
      expect(Object.keys(table)).toEqual(["color", "variant", "size"]);
      expect(table.variant).toEqual(AXES.variant);
      expect(table.size).toEqual(AXES.size);
    },
  );

  it("fails when a doc drops, renames or reorders a value", () => {
    const text = read("documents/components.md");
    expect(matchesStandard(text)).toBe(true);
    const variantRow = "`solid`, `soft`, `outline`, `ghost`, `link`";
    expect(
      matchesStandard(
        mutate(text, variantRow, "`fill`, `soft`, `outline`, `ghost`, `link`"),
      ),
    ).toBe(false);
    expect(
      matchesStandard(
        mutate(text, variantRow, "`solid`, `soft`, `outline`, `ghost`"),
      ),
    ).toBe(false);
    expect(
      matchesStandard(
        mutate(text, variantRow, "`soft`, `solid`, `outline`, `ghost`, `link`"),
      ),
    ).toBe(false);
    expect(
      matchesStandard(
        mutate(text, "`sm`, `md`, `lg`, `icon`", "`sm`, `md`, `lg`"),
      ),
    ).toBe(false);
    expect(
      matchesStandard(mutate(text, "<!-- component-axes:start -->", "")),
    ).toBe(false);
  });
});
