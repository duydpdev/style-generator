import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { writeTmpFile } from "./__fixtures__/tmpProject";

interface FontSize {
  file: string;
  line: number;
  value: string;
  kind: "px" | "binding" | "other";
  literals: string[];
}

interface Inventory {
  files: number;
  vars: Record<string, number>;
  sgVars: Record<string, number>;
  blClasses: Record<string, number>;
  blobLinks: Record<string, number>;
  blobRefs: Record<string, number>;
  fontSizes: FontSize[];
  dsGlobals: Record<string, number>;
}

interface CheckDesignCanvasModule {
  inventoryCanvas: (canvasDir: string) => Inventory;
  checkCanvas: (options: {
    canvasDir: string;
    theme: string;
    stamp?: string;
    intents?: readonly string[];
  }) => string[];
}

const repoRoot = join(__dirname, "..", "..");
const script = join(repoRoot, "scripts", "check-design-canvas.mjs");
const THEME = {
  colors: { primary: "#000", onPrimary: "#fff" },
  borderRadius: { md: "8px" },
};

describe("integration: scripts/check-design-canvas.mjs", () => {
  let dir: string;
  let canvas: string;
  let theme: string;
  let mod: CheckDesignCanvasModule;

  beforeAll(async () => {
    mod = (await import(pathToFileURL(script).href)) as CheckDesignCanvasModule;
  });
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sg-design-canvas-"));
    canvas = join(dir, "canvas");
    theme = writeTmpFile(dir, "theme.json", THEME);
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  const board = (html: string, name = "a.dc.html"): void => {
    writeTmpFile(canvas, name, html);
  };
  const check = (extra: { stamp?: string; intents?: string[] } = {}) =>
    mod.checkCanvas({ canvasDir: canvas, theme, ...extra });

  it("passes a board that reads only theme tokens", () => {
    board(
      '<div style="color:var(--sg-color-on-primary);border-radius:var(--sg-radius-md)">x</div>',
    );
    expect(check()).toEqual([]);
  });

  it("reports a --bl-* variable as a second token namespace", () => {
    board('<p style="color:var(--bl-ink)">x</p>');
    const out = check();
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("second token namespace --bl-ink");
    expect(out[0]).toContain(":1 ");
  });

  it("reports any unprefixed variable, not only --bl-*", () => {
    board('<p style="color:var(--muted)">x</p>');
    const out = check();
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("second token namespace --muted");
  });

  it("allows --layout-*, --spacing and --sg-sp-*", () => {
    board(
      '<div style="width:var(--layout-sidebar);padding:calc(var(--spacing) * 4);margin:var(--sg-sp-4)">x</div>',
    );
    expect(check()).toEqual([]);
  });

  it("reports --bl- text that is not a variable", () => {
    board("<table><tr><td>--bl-input-*</td></tr></table>");
    const out = check();
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("parallel token text");
  });

  it("reports a /_blob/ stylesheet", () => {
    board('<link rel="stylesheet" href="/_blob/abc">');
    const out = check();
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("unchecked stylesheet /_blob/abc");
  });

  it("reports a /_blob/ stylesheet whatever the attribute order", () => {
    board('<link href="/_blob/abc" rel="stylesheet">');
    const out = check();
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("unchecked stylesheet /_blob/abc");
  });

  it("reports a /_blob/ download link apart from stylesheets", () => {
    board('<a href="/_blob/abc" download="x.json">tokens</a>');
    const out = check();
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("unchecked blob link /_blob/abc");
    expect(out[0]).not.toContain("unchecked stylesheet");
    const inv = mod.inventoryCanvas(canvas);
    expect(inv.blobRefs).toEqual({ abc: 1 });
    expect(inv.blobLinks).toEqual({});
  });

  it("reports a px font-size", () => {
    board('<p style="font-size:13px">x</p>');
    const out = check();
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("font-size 13px");
  });

  it("reports a bound font-size and records its literals", () => {
    board(
      [
        '<h1 style="font-size:{{h1}}">Title</h1>',
        "<script>",
        "const s = { h1: D ? '60px' : '38px', h2: D ? '40px' : '28px' };",
        "</script>",
      ].join("\n"),
    );
    const out = check();
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("font-size {{h1}}");
    const [size] = mod.inventoryCanvas(canvas).fontSizes;
    expect(size?.kind).toBe("binding");
    expect(size?.literals).toEqual(["60px", "38px"]);
  });

  it("allows font-size: inherit and font: inherit", () => {
    board(
      '<p style="font-size:inherit">a</p><button style="font: inherit">b</button>',
    );
    expect(check()).toEqual([]);
  });

  it("reports a font shorthand", () => {
    board('<p style="font: 600 14px/1 x">a</p>');
    const out = check();
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("font shorthand");
  });

  it("reports an --sg-* token the theme does not produce", () => {
    board('<p style="color:var(--sg-color-nope)">x</p>');
    const out = check();
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("unknown token --sg-color-nope");
  });

  it("allows any --sg-sp-* spacing variable", () => {
    board('<p style="margin:var(--sg-sp-4)">x</p>');
    expect(check()).toEqual([]);
  });

  it("skips the producer files but scans the rest of ds/", () => {
    writeTmpFile(canvas, "ds/x/tokens.css", ":root { --primary: red; }");
    writeTmpFile(
      canvas,
      "ds/x/components/bundle.css",
      ":root { --primary: red; }",
    );
    expect(check()).toEqual([]);
    writeTmpFile(canvas, "ds/x/extra.css", ":root { --primary: red; }");
    const out = check();
    expect(out).toHaveLength(1);
    expect(out[0]).toContain(
      "ds/x/extra.css:1 second token namespace --primary",
    );
  });

  it("reports button intents outside the allowed list, bound ones included", () => {
    board(
      [
        '<x-import component-from-global-scope="BodyLog.Button" color="danger"></x-import>',
        '<x-import component-from-global-scope="BodyLog.Button" color="{{pc}}"></x-import>',
        '<x-import component-from-global-scope="BodyLog.Button" color="ok"></x-import>',
        "<script>",
        "const v = { pc: 'danger' };",
        "</script>",
      ].join("\n"),
    );
    const out = check({ intents: ["primary", "ok", "bad"] });
    expect(out.filter((v) => v.includes("unknown intent danger"))).toHaveLength(
      2,
    );
    expect(out).toHaveLength(2);
  });

  it("reports a stamp built from other theme bytes", () => {
    const stamp = writeTmpFile(dir, "ds-stamp.json", {
      themeSha256: "0".repeat(64),
    });
    board("<p>x</p>");
    const out = check({ stamp });
    expect(out).toHaveLength(1);
    expect(out[0]).toContain("stamp does not match theme");
  });

  it("accepts a stamp built from these theme bytes", () => {
    const sha = createHash("sha256")
      .update(JSON.stringify(THEME))
      .digest("hex");
    const stamp = writeTmpFile(dir, "ds-stamp.json", { themeSha256: sha });
    board("<p>x</p>");
    expect(check({ stamp })).toEqual([]);
  });

  it("inventories two boards", () => {
    board(
      '<div class="bl-card bl-hover" style="color:var(--bl-ink);font-size:12px">a</div>',
      "one.dc.html",
    );
    board(
      [
        '<x-import component-from-global-scope="BodyLog.Button"></x-import>',
        '<p class="bl-card" style="color:var(--sg-color-primary);background:var(--bl-ink);font-size:{{h2}}">b</p>',
        "<script>const s = { frost: sc ? 'bl-frost' : '', code: '.bl-y { animation: bl-pulse 1s }' };</script>",
      ].join("\n"),
      "two.dc.html",
    );
    const inv = mod.inventoryCanvas(canvas);
    expect(inv.files).toBe(2);
    expect(inv.vars).toEqual({ "--bl-ink": 2 });
    expect(inv.sgVars).toEqual({ "--sg-color-primary": 1 });
    expect(inv.blClasses).toEqual({
      "bl-card": 2,
      "bl-hover": 1,
      "bl-frost": 1,
    });
    expect(inv.fontSizes).toHaveLength(2);
    expect(inv.dsGlobals).toEqual({ "BodyLog.Button": 1 });
  });

  it("CLI: exit 1 with a violation count, exit 2 on an unknown flag", () => {
    board('<p style="font-size:13px">x</p>');
    const failed = spawnSync(
      process.execPath,
      [script, "--canvas", canvas, "--theme", theme],
      { encoding: "utf8" },
    );
    expect(failed.status).toBe(1);
    expect(failed.stdout).toContain("1 violation(s)");
    const usage = spawnSync(process.execPath, [script, "--nope"], {
      encoding: "utf8",
    });
    expect(usage.status).toBe(2);
  });
});
