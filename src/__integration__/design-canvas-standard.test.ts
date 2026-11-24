import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

interface Standard {
  semanticCore: string[];
  radius: string[];
  typeScale: number[];
  boards: { file: string; page: string; title: string }[];
}

const repoRoot = join(__dirname, "..", "..");
const read = (rel: string): string => readFileSync(join(repoRoot, rel), "utf8");
const standard = JSON.parse(
  read("scripts/design-canvas-standard.json"),
) as Standard;

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

const codeSpans = (line: string): string[] =>
  [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? "");

/**
 * The text from a heading to the next `## ` or `### ` heading.
 * @param {string} text - Markdown
 * @param {string} heading - The heading line
 * @returns {string} The section, heading excluded
 */
const section = (text: string, heading: string): string => {
  const start = text.indexOf(`${heading}\n`);
  if (start === -1) return "";
  const body = text.slice(start + heading.length + 1);
  const next = body.search(/^#{2,3} /m);
  return next === -1 ? body : body.slice(0, next);
};

const coreBoardRows = (text: string): string[][] => {
  const start = text.indexOf("<!-- core-boards:start -->");
  const end = text.indexOf("<!-- core-boards:end -->");
  return text
    .slice(start, end)
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .slice(2)
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim().replace(/^`|`$/g, "")),
    );
};

const lineSpans = (text: string, prefix: string): string[] =>
  codeSpans(text.split("\n").find((line) => line.startsWith(prefix)) ?? "");

const typeScale = (text: string): number[] => {
  const naming = section(text, "## Naming");
  const list = /\(([\d, ]+);/.exec(naming)?.[1] ?? "";
  return list.split(",").map((s) => Number(s.trim()));
};

/**
 * The regex the contract's primitive-key line prints: its only code span that starts with `^`.
 * @param {string} text - The contract
 * @param {string} prefix - The start of the primitive-key line
 * @returns {string} The regex source, or an empty string when the line has none
 */
const primitiveSource = (text: string, prefix: string): string =>
  lineSpans(text, prefix).find((span) => span.startsWith("^")) ?? "";

describe("documents pin scripts/design-canvas-standard.json", () => {
  const canvasDoc = read("documents/standards/design-canvas.md");
  const contract = read("documents/agent-contract.md");
  const contractVi = read("documents/vi/agent-contract.md");
  const manifestRows = standard.boards.map((b) => [b.file, b.page, b.title]);
  const firstTitle = standard.boards[0]?.title ?? "";
  let primitive: RegExp;

  beforeAll(async () => {
    ({ PRIMITIVE: primitive } = (await import(
      pathToFileURL(join(repoRoot, "scripts", "check-design-canvas.mjs")).href
    )) as { PRIMITIVE: RegExp });
  });

  it("the core-boards table equals the manifest boards", () => {
    expect(coreBoardRows(canvasDoc)).toEqual(manifestRows);
    const edited = mutate(canvasDoc, firstTitle, `${firstTitle} x`);
    expect(coreBoardRows(edited)).not.toEqual(manifestRows);
  });

  it.each([
    ["agent contract", contract, "Semantic core: "],
    ["Vietnamese contract", contractVi, "Lõi ngữ nghĩa: "],
  ])("the %s's semantic core equals the manifest", (_label, doc, prefix) => {
    expect(lineSpans(doc, prefix)).toEqual(standard.semanticCore);
    const edited = mutate(doc, `${prefix}\``, `${prefix}\`overlay\`, \``);
    expect(lineSpans(edited, prefix)).not.toEqual(standard.semanticCore);
  });

  it("the naming convention lists the manifest's radius keys in order", () => {
    const prefix = "- Radius keys are ";
    expect(lineSpans(contract, prefix)).toEqual(standard.radius);
    const edited = mutate(
      contract,
      `${prefix}\`sm\`, \`md\``,
      `${prefix}\`sm\`, \`mid\``,
    );
    expect(lineSpans(edited, prefix)).not.toEqual(standard.radius);
  });

  it("the canvas standard names the type scale in order", () => {
    expect(typeScale(canvasDoc)).toEqual(standard.typeScale);
    const [first, second] = standard.typeScale;
    const edited = mutate(
      canvasDoc,
      `(${String(first)}, ${String(second)}`,
      `(${String(first)}, 13`,
    );
    expect(typeScale(edited)).not.toEqual(standard.typeScale);
  });

  it.each([
    ["agent contract", contract, "- A primitive key is "],
    ["Vietnamese contract", contractVi, "- Key primitive là "],
  ])(
    "the %s prints the checker's primitive-key regex",
    (_label, doc, prefix) => {
      expect(primitiveSource(doc, prefix)).toBe(primitive.source);
      const edited = mutate(doc, "[1-9]00", "[1-9]0");
      expect(primitiveSource(edited, prefix)).not.toBe(primitive.source);
    },
  );
});
