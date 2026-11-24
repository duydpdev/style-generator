import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

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

const sameList = <T>(a: readonly T[], b: readonly T[]): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

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

const semanticCoreLine = (text: string, prefix: string): string[] =>
  codeSpans(text.split("\n").find((line) => line.startsWith(prefix)) ?? "");

describe("documents pin scripts/design-canvas-standard.json", () => {
  const canvasDoc = read("documents/standards/design-canvas.md");
  const contract = read("documents/agent-contract.md");
  const contractVi = read("documents/vi/agent-contract.md");
  const manifestRows = standard.boards.map((b) => [b.file, b.page, b.title]);

  it("the core-boards table equals the manifest boards", () => {
    const rows = coreBoardRows(canvasDoc);
    expect(rows).toEqual(manifestRows);
    expect(sameList(rows.slice(1), manifestRows)).toBe(false);
  });

  it("the agent contract's semantic core equals the manifest", () => {
    const keys = semanticCoreLine(contract, "Semantic core: ");
    expect(keys).toEqual(standard.semanticCore);
    expect(
      sameList(
        keys.map((k) => (k === "scrim" ? "overlay" : k)),
        standard.semanticCore,
      ),
    ).toBe(false);
  });

  it("the Vietnamese contract's semantic core equals the manifest", () => {
    const keys = semanticCoreLine(contractVi, "Lõi ngữ nghĩa: ");
    expect(keys).toEqual(standard.semanticCore);
    expect(sameList(keys.slice(1), standard.semanticCore)).toBe(false);
  });

  it("the naming convention names the manifest's round radius key", () => {
    const naming = section(contract, "### Naming convention");
    const round = standard.radius[3] ?? "";
    expect(naming).toContain(`\`${round}\``);
    expect(naming.includes("`pill`")).toBe(round === "pill");
  });

  it("the canvas standard names the type scale in order", () => {
    const naming = section(canvasDoc, "## Naming");
    const list = /\(([\d, ]+);/.exec(naming)?.[1] ?? "";
    const steps = list.split(",").map((s) => Number(s.trim()));
    expect(steps).toEqual(standard.typeScale);
    expect(sameList(steps.slice(1), standard.typeScale)).toBe(false);
  });
});
