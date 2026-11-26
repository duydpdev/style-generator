import { describe, expect, it } from "vitest";

import {
  boardClassUses,
  candidatesOf,
  presetCandidates,
  presetUses,
} from "./classCandidates";

describe("candidatesOf", () => {
  it("keeps class-shaped words and drops bindings and sentences", () => {
    expect(
      candidatesOf(
        "flex md:rounded-[6px] {{h2Cls}} hello, bg-primary/50 grid-cols-[1fr,2fr]",
      ),
    ).toEqual([
      "flex",
      "md:rounded-[6px]",
      "bg-primary/50",
      "grid-cols-[1fr,2fr]",
    ]);
  });
});

describe("presetCandidates", () => {
  it("reads the classes of every literal kind", () => {
    const source = [
      'export const a = { disabled: "disabled:opacity-50" };',
      "export const b = { ring: 'focus-visible:outline-2 outline-offset-2' };",
      "export const c = { base: `relative ${cond ? 'z-10' : 'z-20'} flex` };",
    ].join("\n");
    expect(presetCandidates(source)).toEqual(
      expect.arrayContaining([
        "disabled:opacity-50",
        "focus-visible:outline-2",
        "outline-offset-2",
        "relative",
        "flex",
        "z-10",
        "z-20",
      ]),
    );
  });

  it("only reads the source: imports, calls and comments run nothing", () => {
    const source = [
      'import { cva } from "class-variance-authority";',
      "// don't treat this apostrophe as a literal",
      "throw new Error('would run');",
      'export const x = "opacity-disabled";',
    ].join("\n");
    const found = presetCandidates(source);
    expect(found).toContain("opacity-disabled");
    expect(found).not.toContain("class-variance-authority");
  });

  it("skips object keys: a quoted key is a name, not a class list", () => {
    const source = 'export const x = { "text-link": "underline", ok: "flex" };';
    expect(presetCandidates(source)).toEqual(["underline", "flex"]);
  });

  it("reports each class once, at the line it first appears on", () => {
    const source = 'const a = "p-1";\n\nconst b = "disabled:opacity-50 p-1";\n';
    expect(presetUses("ds.preset.ts", source)).toEqual([
      { file: "ds.preset.ts", line: 1, candidate: "p-1" },
      { file: "ds.preset.ts", line: 3, candidate: "disabled:opacity-50" },
    ]);
  });
});

describe("boardClassUses", () => {
  it("lists the classes of every class attribute with their lines", () => {
    const html = [
      '<div class="flex font-display">',
      "  <span class='text-12-regular {{ring}}'>x</span>",
      "</div>",
    ].join("\n");
    expect(boardClassUses("a.dc.html", html)).toEqual([
      { file: "a.dc.html", line: 1, candidate: "flex" },
      { file: "a.dc.html", line: 1, candidate: "font-display" },
      { file: "a.dc.html", line: 2, candidate: "text-12-regular" },
    ]);
  });
});
