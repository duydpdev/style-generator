import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { checkCanvas } from "../cli/commands/canvas";

import { writeTmpFile } from "./__fixtures__/tmpProject";

const repoRoot = join(__dirname, "..", "..");
const MISSING_INVENTORY = "canvas.json:1 missing canvas.json";

interface Example {
  kind: "theme" | "board";
  body: string;
}

// A fence preceded by `<!-- canvas-check: theme|board -->` (an optional `<!-- prettier-ignore -->` may sit between).
const TAGGED =
  /<!-- canvas-check: (theme|board) -->\n(?:<!-- prettier-ignore -->\n)?```(?:json|html)\n([\s\S]*?)\n```/g;

function taggedExamples(markdown: string): Example[] {
  return [...markdown.matchAll(TAGGED)].map((m) => ({
    kind: m[1] as Example["kind"],
    body: m[2] ?? "",
  }));
}

describe("canvas-check examples in the docs", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sg-doc-canvas-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // The violations of the tagged examples of `markdown`: its first theme, with every tagged board as a canvas file.
  const violationsOf = async (
    markdown: string,
    naming = true,
  ): Promise<string[]> => {
    const examples = taggedExamples(markdown);
    const theme = examples.find((e) => e.kind === "theme");
    if (theme === undefined) return ["no tagged theme example"];
    writeTmpFile(dir, "theme.json", theme.body);
    mkdirSync(join(dir, "canvas"), { recursive: true });
    const boards = examples.filter((e) => e.kind === "board");
    for (const [i, board] of boards.entries()) {
      writeTmpFile(dir, `canvas/board-${String(i)}.dc.html`, board.body);
    }
    const result = await checkCanvas({
      canvasDir: "canvas",
      theme: "theme.json",
      naming,
      boards: boards.length > 0,
      cwd: dir,
    });
    // A doc example is a fragment, never a whole canvas, so its inventory file does not exist.
    // Only `errors` are read; findings (such as unused tokens) do not apply to a fragment either.
    return result.errors.filter((line) => line !== MISSING_INVENTORY);
  };

  it("passes the tagged theme of documents/agent-contract.md", async () => {
    const markdown = readFileSync(
      join(repoRoot, "documents/agent-contract.md"),
      "utf8",
    );
    expect(taggedExamples(markdown).length).toBeGreaterThanOrEqual(1);
    expect(await violationsOf(markdown)).toEqual([]);
  });

  it("fails a tagged theme that breaks the standard", async () => {
    const markdown = readFileSync(
      join(repoRoot, "documents/agent-contract.md"),
      "utf8",
    );
    const broken = markdown.replace('    "scrim": "$gray900/50",\n', "");
    expect(broken).not.toBe(markdown);
    expect((await violationsOf(broken)).length).toBeGreaterThan(0);
  });

  const doc = (theme: object, board?: string): string =>
    [
      "<!-- canvas-check: theme -->",
      "```json",
      JSON.stringify(theme),
      "```",
      ...(board === undefined
        ? []
        : ["", "<!-- canvas-check: board -->", "```html", board, "```"]),
    ].join("\n");

  const THEME = {
    colors: { primary: "#111111", foreground: "#222222" },
    fontFamily: { sans: '"Geist", sans-serif' },
  };

  it("checks a tagged board against the document's theme", async () => {
    expect(
      await violationsOf(
        doc(THEME, '<div class="text-primary">x</div>'),
        false,
      ),
    ).toEqual([]);
    const bad = await violationsOf(
      doc(THEME, '<div class="text-nothing">x</div>'),
      false,
    );
    expect(bad.some((line) => line.includes("[ref-class;"))).toBe(true);
  });

  it("ignores a fence without the tag", () => {
    expect(taggedExamples("```json\n{}\n```")).toEqual([]);
  });
});
