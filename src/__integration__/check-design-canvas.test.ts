import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkCanvas, inventoryCanvas } from "../cli/commands/canvas";
import { logger } from "../cli/logger";
import { runCli } from "../cli/run";

import { writeTmpFile } from "./__fixtures__/tmpProject";

interface Standard {
  boards: { file: string; page: string; title: string }[];
  pages: { id: string; name: string }[];
  content: Record<string, { sections: string[]; literals: string[] }>;
  provenanceBoard: string;
}

interface NamedTheme {
  colors: Record<string, string>;
  typography: Record<string, Record<string, string | number>>;
  borderRadius: Record<string, string>;
  themeAxes: { theme: { dark: { colors: Record<string, string> } } };
}

const repoRoot = join(__dirname, "..", "..");
const standardFile = join(
  repoRoot,
  "src",
  "cli",
  "canvas",
  "design-canvas-standard.json",
);
const STANDARD = JSON.parse(readFileSync(standardFile, "utf8")) as Standard;

/** A theme that follows every naming rule. */
const NAMED: NamedTheme = {
  colors: {
    gray100: "#f3f4f6",
    gray900: "#111827",
    blue600: "#2563eb",
    blue700: "#1d4ed8",
    blue800: "#1e40af",
    white: "#ffffff",
    red600: "#dc2626",
    green600: "#16a34a",
    amber500: "#f59e0b",
    blackAlpha40: "rgba(0, 0, 0, 0.4)",
    background: "$white",
    surface: "$gray100",
    foreground: "$gray900",
    muted: "$gray100",
    mutedForeground: "$gray900",
    border: "$gray100",
    primary: "$blue600",
    primaryForeground: "$white",
    primaryHover: "$blue700",
    primaryActive: "$blue800",
    danger: "$red600",
    success: "$green600",
    warning: "$amber500",
    focus: "$blue600",
    scrim: "$blackAlpha40",
  },
  typography: {
    text14Medium: { fontSize: "14px", lineHeight: "20px", fontWeight: 500 },
    text16Regular: { fontSize: "16px", lineHeight: "24px", fontWeight: 400 },
  },
  borderRadius: { md: "8px" },
  themeAxes: { theme: { dark: { colors: { background: "$gray900" } } } },
};

/**
 * A copy of `NAMED` with one change.
 * @param {(t: NamedTheme) => void} edit - The change
 * @returns {NamedTheme} The edited copy
 */
const named = (edit: (t: NamedTheme) => void = () => undefined): NamedTheme => {
  const copy = structuredClone(NAMED);
  edit(copy);
  return copy;
};

/**
 * The entry a fixture edit changes; throws when the fixture lacks it, so an
 * edit never lands on a throwaway object.
 * @template T
 * @param {Record<string, T>} record - Fixture record
 * @param {string} key - Entry key
 * @returns {T} The entry
 */
const entry = <T>(record: Record<string, T>, key: string): T => {
  const value = record[key];
  if (value === undefined) throw new Error(`fixture has no ${key}`);
  return value;
};

const COMPONENT_BOARDS = ["box", "text", "stack", "flex", "grid", "button"].map(
  (name) => `c-${name}.dc.html`,
);

const THEME = {
  colors: { primary: "#000", primaryForeground: "#fff" },
  borderRadius: { md: "8px" },
};

/** SHA-256 of the theme bytes `writeTmpFile` writes for `THEME`. */
const THEME_SHA = createHash("sha256")
  .update(JSON.stringify(THEME))
  .digest("hex");

/** The provenance block of the valid `Main.dc.html`. */
const PROVENANCE = {
  theme: THEME_SHA.slice(0, 12),
  lib: "8.2.3",
  ds: "3",
  built: "2026-11-24",
};

/** The frame of every board `writeBoards` lists, unless an edit changes it. */
const FRAME = { w: 400, h: 300 };

/**
 * A root `<div>` with the minimum component padding.
 * @param {string} inner - Its content
 * @returns {string} The root element, on one line
 */
const padded = (inner: string): string =>
  `<div style="padding: calc(var(--spacing) * 8)">${inner}</div>`;

/**
 * A board in the editor's markup: `<x-dc>` on line 1, the root on line 2,
 * then the `data-dc-script` block with its `$preview`.
 * @param {string} root - Root element, on one line
 * @param {{ w: number, h: number }} frame - `$preview` size
 * @returns {string} The board
 */
const boardHtml = (root: string, frame = FRAME): string =>
  [
    "<x-dc>",
    root,
    "</x-dc>",
    `<script type="text/x-dc" data-dc-script data-props='${JSON.stringify({ $preview: { width: frame.w, height: frame.h } })}'></script>`,
  ].join("\n");

/**
 * A core board that carries its manifest sections and theme literals (and
 * the provenance block on `Main.dc.html`), all on line 2.
 * @param {string} file - Core board file
 * @returns {string} The board
 */
const coreBoardHtml = (file: string): string => {
  const { sections, literals } = entry(STANDARD.content, file);
  const theme = THEME as Record<string, unknown>;
  const blocks = [
    ...sections.map((id) => `<section data-sg-section="${id}"></section>`),
    ...literals.map(
      (path) =>
        `<script type="application/json" data-sg-literal="${path}">${JSON.stringify(theme[path] ?? {})}</script>`,
    ),
    ...(file === STANDARD.provenanceBoard
      ? [
          `<script type="application/json" data-sg-provenance="main">${JSON.stringify(PROVENANCE)}</script>`,
        ]
      : []),
  ];
  return boardHtml(padded(blocks.join("")));
};

describe("integration: style-gen canvas check", () => {
  let dir: string;
  let canvas: string;
  let theme: string;
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
  const check = (
    extra: {
      stamp?: string | undefined;
      intents?: string[] | undefined;
      naming?: boolean | undefined;
      boards?: boolean | undefined;
      standard?: string | undefined;
      dsVersion?: { namespace: string; version: string } | undefined;
    } = {},
  ) => checkCanvas({ canvasDir: canvas, theme, ...extra });
  const useTheme = (value: object): void => {
    theme = writeTmpFile(dir, "theme.json", value);
  };
  /**
   * Runs `style-gen canvas check` in process (never the built CLI, which may be stale).
   * @param {string[]} args - Flags after `--canvas` and `--theme`
   * @returns {Promise<{ status: number, stdout: string, last: string }>} Exit code, printed lines and the last one
   */
  const cli = async (...args: string[]) => {
    const log = vi.spyOn(logger, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(logger, "error").mockImplementation(() => undefined);
    try {
      const status = await runCli(
        ["canvas", "check", "--canvas", canvas, "--theme", theme, ...args],
        dir,
      );
      const lines = log.mock.calls.map((c) => c[0]);
      return { status, stdout: lines.join("\n"), last: lines.at(-1) ?? "" };
    } finally {
      log.mockRestore();
      error.mockRestore();
    }
  };
  interface CanvasJson {
    pages: { id: string; name: string }[];
    boards: Record<
      string,
      { title: string; page: string; w?: number; h?: number }
    >;
    order: string[];
    designSystems: { namespace: string; version: string }[];
  }
  /**
   * Writes a canvas with the manifest's pages, core boards and component
   * boards, after `edit` changes its `canvas.json`. Every listed board is
   * valid under every rule: core boards carry their content, the others get
   * a padded root (`roots[file]` replaces it) and a `$preview` equal to their
   * frame. `plain` writes `<p>x</p>` boards instead.
   * @param {(c: CanvasJson) => void} edit - Change to `canvas.json`
   * @param {Record<string, string>} roots - Root element per board file
   * @param {boolean} plain - Write content-free boards
   */
  const writeBoards = (
    edit: (c: CanvasJson) => void = () => undefined,
    roots: Record<string, string> = {},
    plain = false,
  ): void => {
    const json: CanvasJson = {
      pages: STANDARD.pages.map((p) => ({ ...p })),
      boards: {},
      order: [],
      designSystems: [{ namespace: "BodyLog", version: "3" }],
    };
    for (const b of STANDARD.boards) {
      json.boards[b.file] = { title: b.title, page: b.page, ...FRAME };
      json.order.push(b.file);
    }
    for (const file of COMPONENT_BOARDS) {
      json.boards[file] = {
        title: `Component / ${file}`,
        page: "cl",
        ...FRAME,
      };
      json.order.push(file);
    }
    edit(json);
    for (const file of json.order) {
      const { w = FRAME.w, h = FRAME.h } = json.boards[file] ?? {};
      const core = file in STANDARD.content && roots[file] === undefined;
      if (plain) board("<p>x</p>", file);
      else if (core) board(coreBoardHtml(file), file);
      else board(boardHtml(roots[file] ?? padded("x"), { w, h }), file);
    }
    writeTmpFile(canvas, "canvas.json", json);
  };
  /**
   * Rewrites one canvas file.
   * @param {string} file - Path below the canvas dir
   * @param {(text: string) => string} edit - The change; it must change the text
   */
  const rewrite = (file: string, edit: (text: string) => string): void => {
    const before = readFileSync(join(canvas, file), "utf8");
    const after = edit(before);
    if (after === before) throw new Error(`edit left ${file} unchanged`);
    board(after, file);
  };
  /**
   * A stamp for the test theme.
   * @param {object} fields - Fields that replace the valid ones
   * @returns {string} The stamp file
   */
  const writeStamp = (fields: object = {}): string =>
    writeTmpFile(dir, "ds-stamp.json", {
      themeSha256: THEME_SHA,
      libVersion: PROVENANCE.lib,
      ...fields,
    });

  it("passes a board that reads only theme tokens", () => {
    board(
      '<div style="color:var(--sg-color-primary-foreground);border-radius:var(--sg-radius-md)">x</div>',
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
    const inv = inventoryCanvas(canvas);
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
    const [size] = inventoryCanvas(canvas).fontSizes;
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
    const inv = inventoryCanvas(canvas);
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

  it("CLI: exit 1 with a violation count, exit 2 on an unknown flag", async () => {
    board('<p style="font-size:13px">x</p>');
    const failed = await cli();
    expect(failed.status).toBe(1);
    expect(failed.stdout).toContain("1 violation(s)");
    expect((await cli("--nope")).status).toBe(2);
  });

  describe("--naming: inline font-weight", () => {
    beforeEach(() => {
      useTheme(NAMED);
    });

    it("reports an inline font-weight under naming", () => {
      board('<b style="font-weight:600">x</b>');
      expect(check({ naming: true })).toEqual([
        "a.dc.html:1 font-weight 600 (use a typography class)",
      ]);
    });

    it("allows font-weight: inherit under naming", () => {
      board('<b style="font-weight:inherit">x</b>');
      expect(check({ naming: true })).toEqual([]);
    });

    it("reports font-weight in a stylesheet under naming", () => {
      writeTmpFile(canvas, "x.css", ".a{font-weight:700}");
      expect(check({ naming: true })).toEqual([
        "x.css:1 font-weight 700 (use a typography class)",
      ]);
    });

    it("reports a bound font-weight under naming whole", () => {
      board('<b style="font-weight:{{ w }}">x</b>');
      expect(check({ naming: true })).toEqual([
        "a.dc.html:1 font-weight {{ w }} (use a typography class)",
      ]);
    });

    it("ignores font-weight without naming", () => {
      board('<b style="font-weight:600">x</b>');
      expect(check()).toEqual([]);
    });

    it("inventories font-weight with or without naming", () => {
      board('<b style="font-weight:600">x</b>');
      const inv = inventoryCanvas(canvas);
      expect(inv.fontWeights.map((f) => f.value)).toEqual(["600"]);
    });
  });

  describe("--naming: theme grammar", () => {
    const grammar = (t: NamedTheme): string[] => {
      useTheme(t);
      board("<p>x</p>");
      return check({ naming: true }).map((line) =>
        line.slice(line.indexOf(":1 ") + 3),
      );
    };

    it("naming passes a theme that follows every rule", () => {
      expect(grammar(NAMED)).toEqual([]);
    });

    it.each<[string, (t: NamedTheme) => void, string]>([
      [
        "a literal semantic key",
        (t) => (t.colors.successForeground = "#123"),
        "colors.successForeground is not a primitive name and not an alias of a primitive",
      ],
      [
        "a semantic key aliasing a semantic key",
        (t) => (t.colors.danger = "$primary"),
        "colors.danger aliases semantic key primary (alias a primitive)",
      ],
      [
        "a primitive holding an alias",
        (t) => (t.colors.red600 = "$blue600"),
        "colors.red600 is a primitive name but holds an alias",
      ],
      [
        "a missing core key",
        (t) => delete t.colors.scrim,
        "missing semantic core key scrim",
      ],
      [
        "a role-named typography key",
        (t) => {
          t.typography.body = entry(t.typography, "text16Regular");
          delete t.typography.text16Regular;
        },
        "typography.body does not match text<size><Weight>",
      ],
      [
        "a weight that disagrees with the name",
        (t) => (entry(t.typography, "text16Regular").fontWeight = 600),
        "typography.text16Regular name says Regular, fontWeight is 600",
      ],
      [
        "a size that disagrees with the name",
        (t) =>
          (t.typography.text14Medium = {
            fontSize: "1rem",
            lineHeight: "24px",
            fontWeight: 500,
          }),
        "typography.text14Medium name says 14px, fontSize is 1rem",
      ],
      [
        "two line heights at one size",
        (t) =>
          (t.typography.text16Medium = {
            fontSize: "16px",
            lineHeight: "22px",
            fontWeight: 500,
          }),
        "typography line-height differs at 16px: text16Regular=24px, text16Medium=22px",
      ],
      [
        "an override of a primitive",
        (t) => (t.themeAxes.theme.dark.colors.blue600 = "#000"),
        "themeAxes.theme.dark.colors.blue600 overrides a primitive",
      ],
      [
        "a literal override of a semantic key",
        (t) => (t.themeAxes.theme.dark.colors.surface = "#000"),
        "themeAxes.theme.dark.colors.surface is not an alias of a primitive",
      ],
      [
        "a radius key off the list",
        (t) => (t.borderRadius.xl = "16px"),
        "borderRadius.xl is not one of sm, md, lg, full",
      ],
      [
        "a typography entry that sets fontFamily",
        (t) =>
          (entry(t.typography, "text16Regular").fontFamily =
            "var(--sg-font-display)"),
        "typography.text16Regular sets fontFamily (use a font-<family> class)",
      ],
      [
        "a size off the type scale",
        (t) =>
          (t.typography.text18Regular = {
            fontSize: "18px",
            lineHeight: "26px",
            fontWeight: 400,
          }),
        "typography.text18Regular size 18px is not on the scale",
      ],
    ])("naming reports %s", (_name, edit, message) => {
      expect(grammar(named(edit))).toEqual([message]);
    });

    it("naming reports a malformed theme instead of throwing", () => {
      expect(
        grammar({
          colors: "x",
          typography: { text16Regular: null },
        } as unknown as NamedTheme),
      ).toContain("missing semantic core key background");
    });
  });

  describe("--naming: primitive token on screens", () => {
    beforeEach(() => {
      useTheme(NAMED);
    });

    it("reports a primitive token on a screen", () => {
      board(
        '<p style="color:var(--sg-color-blue-600)">x</p>',
        "screen.dc.html",
      );
      expect(check({ naming: true })).toEqual([
        "screen.dc.html:1 primitive token --sg-color-blue-600 (use a semantic key)",
      ]);
    });

    it("allows a primitive token on ds-mau", () => {
      board(
        '<p style="color:var(--sg-color-blue-600)">x</p>',
        "ds-mau.dc.html",
      );
      expect(check({ naming: true })).toEqual([]);
    });

    it("ignores primitive tokens without naming", () => {
      board(
        '<p style="color:var(--sg-color-blue-600)">x</p>',
        "screen.dc.html",
      );
      expect(check()).toEqual([]);
    });
  });

  describe("--boards", () => {
    it("boards passes the full fixture", () => {
      writeBoards();
      expect(check({ boards: true })).toEqual([]);
    });

    it("boards reports a missing core board", () => {
      writeBoards();
      unlinkSync(join(canvas, "ds-mau.dc.html"));
      expect(check({ boards: true })).toEqual([
        "canvas.json:1 missing core board ds-mau.dc.html",
      ]);
    });

    it("boards reports a core board on the wrong page", () => {
      writeBoards((c) => {
        entry(c.boards, "ds-chu.dc.html").page = "cl";
      });
      expect(check({ boards: true })).toEqual([
        "canvas.json:1 board ds-chu.dc.html is on page cl, expected ds",
        "canvas.json:1 board ds-chu.dc.html on page cl is not a c-* board",
      ]);
    });

    it("boards reports a wrong core title", () => {
      writeBoards((c) => {
        entry(c.boards, "ds-luoi.dc.html").title = "Grid";
      });
      expect(check({ boards: true })).toEqual([
        'canvas.json:1 board ds-luoi.dc.html title "Grid", expected "Board / Design system / Lưới & breakpoint"',
      ]);
    });

    it("boards reports a missing component board", () => {
      writeBoards((c) => {
        c.order = c.order.filter((f) => f !== "c-button.dc.html");
        delete c.boards["c-button.dc.html"];
      });
      expect(check({ boards: true })).toEqual([
        "canvas.json:1 missing component board c-button.dc.html",
      ]);
    });

    it("boards reports a component title without the prefix", () => {
      writeBoards((c) => {
        entry(c.boards, "c-box.dc.html").title = "Box";
      });
      expect(check({ boards: true })).toEqual([
        'canvas.json:1 board c-box.dc.html title must start with "Component / "',
      ]);
    });

    it("boards reports a missing page", () => {
      writeBoards((c) => {
        c.pages = c.pages.filter((p) => p.id !== "bia");
      });
      expect(check({ boards: true })).toEqual([
        "canvas.json:1 missing page bia",
      ]);
    });

    it("boards reports core boards out of order", () => {
      writeBoards((c) => {
        const [a, b] = [
          c.order.indexOf("ds-mau.dc.html"),
          c.order.indexOf("ds-chu.dc.html"),
        ];
        [c.order[a], c.order[b]] = ["ds-chu.dc.html", "ds-mau.dc.html"];
      });
      expect(check({ boards: true })).toEqual([
        "canvas.json:1 core boards out of order in canvas.json#order (expected Main.dc.html, ds-mau.dc.html, ds-chu.dc.html, ds-khung.dc.html, ds-luoi.dc.html, ds-token.dc.html)",
      ]);
    });

    it("boards reports a missing canvas.json", () => {
      board("<p>x</p>");
      expect(check({ boards: true })).toEqual([
        "canvas.json:1 missing canvas.json",
      ]);
    });

    it("boards reads another manifest through the standard option", () => {
      const copy = structuredClone(STANDARD);
      const mau = copy.boards.find((b) => b.file === "ds-mau.dc.html");
      if (mau) mau.title = "X";
      const standard = writeTmpFile(dir, "standard.json", {
        ...(JSON.parse(readFileSync(standardFile, "utf8")) as object),
        boards: copy.boards,
      });
      writeBoards((c) => {
        entry(c.boards, "ds-mau.dc.html").title = "X";
      });
      expect(check({ boards: true, standard })).toEqual([]);
      expect(check({ boards: true })).toEqual([
        'canvas.json:1 board ds-mau.dc.html title "X", expected "Board / Design system / Màu sắc / Light + Dark"',
      ]);
    });
  });

  describe("--boards: manifest without the content keys", () => {
    it("boards skips the content, component-page and frame rules on an older manifest", () => {
      const older = JSON.parse(readFileSync(standardFile, "utf8")) as Record<
        string,
        unknown
      >;
      delete older.content;
      delete older.sourceBoards;
      delete older.provenanceBoard;
      const standard = writeTmpFile(dir, "standard.json", older);
      writeBoards(undefined, {}, true);
      expect(check({ boards: true, standard })).toEqual([]);
      expect(check({ boards: true })).not.toEqual([]);
    });
  });

  describe("board content", () => {
    it("content passes core boards with their sections, literals and provenance", () => {
      writeBoards();
      expect(
        check({
          boards: true,
          stamp: writeStamp(),
          dsVersion: { namespace: "BodyLog", version: "3" },
        }),
      ).toEqual([]);
    });

    it.each<[string, string, (t: string) => string, string]>([
      [
        "a missing section",
        "ds-chu.dc.html",
        (t) => t.replace('data-sg-section="typography"', 'data-sg-section="x"'),
        "ds-chu.dc.html:1 missing section typography",
      ],
      [
        "a missing literal",
        "ds-mau.dc.html",
        (t) => t.replace('data-sg-literal="colors"', 'data-sg-literal="x"'),
        "ds-mau.dc.html:1 missing literal colors",
      ],
      [
        "a literal lacking a key",
        "ds-mau.dc.html",
        (t) => t.replace(',"primaryForeground":"#fff"', ""),
        "ds-mau.dc.html:2 literal colors lacks key primaryForeground",
      ],
      [
        "a literal with an extra key",
        "ds-mau.dc.html",
        (t) =>
          t.replace(
            '"primaryForeground":"#fff"',
            '"primaryForeground":"#fff","x":"#123"',
          ),
        "ds-mau.dc.html:2 literal colors has extra key x",
      ],
      [
        "a changed value",
        "ds-mau.dc.html",
        (t) => t.replace('"primary":"#000"', '"primary":"#111"'),
        'ds-mau.dc.html:2 literal colors.primary is "#111", theme has "#000"',
      ],
      [
        "invalid JSON",
        "ds-khung.dc.html",
        (t) => t.replace('{"md":"8px"}', "{md:8px}"),
        "ds-khung.dc.html:2 literal borderRadius is not valid JSON",
      ],
      [
        "a missing provenance block",
        "Main.dc.html",
        (t) => t.replace('data-sg-provenance="main"', 'data-sg-provenance="x"'),
        "Main.dc.html:1 missing provenance block",
      ],
      [
        "a bad built date",
        "Main.dc.html",
        (t) => t.replace('"built":"2026-11-24"', '"built":"24/11/2026"'),
        'Main.dc.html:2 provenance built "24/11/2026" is not YYYY-MM-DD',
      ],
    ])("content reports %s", (_name, file, edit, message) => {
      writeBoards();
      rewrite(file, edit);
      expect(check({ boards: true })).toContain(message);
    });

    it("content reports a provenance theme the stamp does not have", () => {
      writeBoards();
      const out = check({
        boards: true,
        stamp: writeStamp({ themeSha256: "0".repeat(64) }),
      });
      expect(out).toContain(
        `Main.dc.html:2 provenance theme "${PROVENANCE.theme}", stamp has "000000000000"`,
      );
    });

    it("content reports a provenance lib the stamp does not have", () => {
      writeBoards();
      expect(
        check({ boards: true, stamp: writeStamp({ libVersion: "9.0.0" }) }),
      ).toContain('Main.dc.html:2 provenance lib "8.2.3", stamp has "9.0.0"');
    });

    it("content reports a provenance ds other than --ds-version", () => {
      writeBoards();
      expect(
        check({
          boards: true,
          dsVersion: { namespace: "BodyLog", version: "4" },
        }),
      ).toContain('Main.dc.html:2 provenance ds "3", expected "4"');
    });

    it("content echoes a board value on one line", () => {
      writeBoards();
      rewrite("ds-mau.dc.html", (t) =>
        t.replace('"primary":"#000"', '"primary":"#000\\nOK: 1 files"'),
      );
      const out = check({ boards: true });
      expect(out).toEqual([
        'ds-mau.dc.html:2 literal colors.primary is "#000\\nOK: 1 files", theme has "#000"',
      ]);
      expect(out.join("\n").split("\n")).toHaveLength(1);
    });
  });

  describe("component pages", () => {
    /**
     * Adds `c-toast` on the component page and `s-toast` on the source page.
     * @param {CanvasJson} c - `canvas.json`
     */
    const withToast = (c: CanvasJson): void => {
      c.boards["c-toast.dc.html"] = {
        title: "Component / Toast",
        page: "cl",
        ...FRAME,
      };
      c.boards["s-toast.dc.html"] = { title: "Toast", page: "src", ...FRAME };
      c.order.push("c-toast.dc.html", "s-toast.dc.html");
    };
    const imports = (...names: string[]): string =>
      padded(names.map((n) => `<dc-import name="${n}"></dc-import>`).join(""));

    it("component pages pass a c-* board that imports its s-* source", () => {
      writeBoards(withToast, {
        "c-toast.dc.html": imports("s-toast", "Icon"),
      });
      expect(check({ boards: true })).toEqual([]);
    });

    it.each<[string, Record<string, string>, string]>([
      [
        "no source",
        { "c-toast.dc.html": padded("x") },
        "c-toast.dc.html:1 board must import exactly s-toast, found none",
      ],
      [
        "two sources",
        { "c-toast.dc.html": imports("s-toast", "s-other") },
        "c-toast.dc.html:1 board must import exactly s-toast, found s-toast, s-other",
      ],
      [
        "a wrong source name",
        { "c-toast.dc.html": imports("s-tost") },
        "c-toast.dc.html:1 board must import exactly s-toast, found s-tost",
      ],
      [
        "a design-system component with an import",
        {
          "c-toast.dc.html": imports("s-toast"),
          "c-box.dc.html": imports("s-box"),
        },
        "c-box.dc.html:2 design-system component boards render from the bundle; remove dc-import s-box",
      ],
      [
        "padding * 6",
        {
          "c-toast.dc.html": imports("s-toast"),
          "c-box.dc.html":
            '<div style="padding: calc(var(--spacing) * 6)">x</div>',
        },
        'c-box.dc.html:2 root padding "calc(var(--spacing) * 6)" (use calc(var(--spacing) * 8) or more)',
      ],
      [
        "no padding",
        {
          "c-toast.dc.html": imports("s-toast"),
          "c-box.dc.html": "<div>x</div>",
        },
        "c-box.dc.html:2 root has no padding (use calc(var(--spacing) * 8) or more)",
      ],
    ])("component pages report %s", (_name, roots, message) => {
      writeBoards(withToast, roots);
      expect(check({ boards: true })).toEqual([message]);
    });

    it("component pages report a cl-* board", () => {
      writeBoards((c) => {
        c.boards["cl-x.dc.html"] = {
          title: "Component / X",
          page: "cl",
          ...FRAME,
        };
        c.order.push("cl-x.dc.html");
      });
      expect(check({ boards: true })).toEqual([
        "cl-x.dc.html:1 cl-* boards are retired (split into one c-* board per component)",
        "canvas.json:1 board cl-x.dc.html on page cl is not a c-* board",
      ]);
    });

    it("component pages report a non-c-* board on the component page", () => {
      writeBoards((c) => {
        c.boards["group.dc.html"] = {
          title: "Component / Group",
          page: "cl",
          ...FRAME,
        };
        c.order.push("group.dc.html");
      });
      expect(check({ boards: true })).toEqual([
        "canvas.json:1 board group.dc.html on page cl is not a c-* board",
      ]);
    });

    it("component pages report an s-* board off the source page", () => {
      writeBoards(
        (c) => {
          withToast(c);
          entry(c.boards, "s-toast.dc.html").page = "ds";
        },
        { "c-toast.dc.html": imports("s-toast") },
      );
      expect(check({ boards: true })).toEqual([
        "canvas.json:1 board s-toast.dc.html is on page ds, expected src",
      ]);
    });

    it("component pages report a screen that imports a c-* board", () => {
      writeBoards(
        (c) => {
          withToast(c);
          c.boards["screen.dc.html"] = {
            title: "Screen",
            page: "app",
            ...FRAME,
          };
          c.order.push("screen.dc.html");
        },
        {
          "c-toast.dc.html": imports("s-toast"),
          "screen.dc.html": imports("c-toast"),
        },
      );
      expect(check({ boards: true })).toEqual([
        "screen.dc.html:2 imports showcase board c-toast (import s-toast)",
      ]);
    });

    it("component pages report a frame larger than 1440×1600", () => {
      writeBoards((c) => {
        entry(c.boards, "c-box.dc.html").w = 1441;
      });
      expect(check({ boards: true })).toEqual([
        "canvas.json:1 board c-box.dc.html frame 1441×300 exceeds 1440×1600",
      ]);
    });
  });

  describe("hand-written values", () => {
    beforeEach(() => {
      useTheme(NAMED);
    });
    const declarations =
      "<div style=\"border-radius: 12px; line-height: 1.5; font-family: 'Geist', sans-serif\">x</div>";

    it("hand-written values are reported under naming", () => {
      board(declarations);
      expect(check({ naming: true })).toEqual([
        "a.dc.html:1 border-radius 12px (use var(--sg-radius-*) or a rounded-* class)",
        "a.dc.html:1 line-height 1.5 (use a typography class)",
        "a.dc.html:1 font-family 'Geist', sans-serif (use a font-* class)",
      ]);
    });

    it("hand-written values are reported in stylesheets and bindings", () => {
      writeTmpFile(canvas, "x.css", ".a{border-top-left-radius:4px}");
      board('<p style="line-height:{{ lh }}">x</p>');
      expect(check({ naming: true })).toEqual([
        "a.dc.html:1 line-height {{ lh }} (use a typography class)",
        "x.css:1 border-top-left-radius 4px (use var(--sg-radius-*) or a rounded-* class)",
      ]);
    });

    it("hand-written values are reported on a primitive board too", () => {
      board(declarations, "ds-mau.dc.html");
      expect(check({ naming: true })).toHaveLength(3);
    });

    it("hand-written values allow 0, inherit and theme variables", () => {
      board(
        [
          '<div style="border-radius: 0; line-height: inherit; font-family: inherit">a</div>',
          '<div style="border-radius: var(--sg-radius-md); font-family: var(--sg-font-sans)">b</div>',
          '<div style="border-radius: inherit">c</div>',
        ].join("\n"),
      );
      expect(
        check({ naming: true }).filter((l) => !l.includes("unknown token")),
      ).toEqual([]);
    });

    it("hand-written values are ignored without naming", () => {
      board(declarations);
      expect(check()).toEqual([]);
    });
  });

  describe("frames", () => {
    it("frames report a $preview that differs from the frame", () => {
      writeBoards();
      rewrite("c-box.dc.html", (t) => t.replace('"width":400', '"width":500'));
      expect(check({ boards: true })).toEqual([
        "c-box.dc.html:1 $preview 500×300, canvas.json frame 400×300",
      ]);
    });

    it("frames report a listed board without $preview", () => {
      writeBoards();
      rewrite("c-box.dc.html", (t) => t.slice(0, t.indexOf("<script")));
      expect(check({ boards: true })).toEqual([
        "c-box.dc.html:1 missing $preview",
      ]);
    });

    it.each<[string, string, string]>([
      [
        "a fixed root height",
        '<div style="padding: calc(var(--spacing) * 8); height: 600px">x</div>',
        'c-box.dc.html:2 root sets height "600px" (let the content size the frame)',
      ],
      [
        "a root that hides overflow",
        '<div style="padding: calc(var(--spacing) * 8); overflow: hidden">x</div>',
        "c-box.dc.html:2 root hides overflow",
      ],
      [
        "a root with the overflow-hidden class",
        '<div class="flex overflow-hidden" style="padding: calc(var(--spacing) * 8)">x</div>',
        "c-box.dc.html:2 root hides overflow",
      ],
    ])("frames report %s", (_name, root, message) => {
      writeBoards(undefined, { "c-box.dc.html": root });
      expect(check({ boards: true })).toEqual([message]);
    });

    it("frames report order groups out of order", () => {
      writeBoards((c) => {
        c.boards["s-x.dc.html"] = { title: "X", page: "src", ...FRAME };
        c.order = [
          ...STANDARD.boards.map((b) => b.file),
          "s-x.dc.html",
          ...COMPONENT_BOARDS,
        ];
      });
      expect(check({ boards: true })).toEqual([
        "canvas.json:1 order groups out of order: c-box.dc.html after s-x.dc.html (expected core, c-*, s-*, screens)",
      ]);
    });

    it("frames report pages out of order", () => {
      writeBoards((c) => {
        const [bia, ds, ...rest] = c.pages;
        if (bia === undefined || ds === undefined) throw new Error("pages");
        c.pages = [ds, bia, ...rest];
      });
      expect(check({ boards: true })).toEqual([
        "canvas.json:1 pages out of order (expected bia, ds, cl, src, then screens)",
      ]);
    });

    it("frames never read a canvas.json key outside the canvas", () => {
      writeTmpFile(dir, "outside.dc.html", "<div>no preview</div>");
      writeBoards((c) => {
        c.boards["../outside.dc.html"] = { title: "X", page: "cl" };
      });
      expect(check({ boards: true, naming: true }).join("\n")).not.toContain(
        "outside",
      );
    });
  });

  describe("broken canvas fixture", () => {
    it("broken canvas reports one line of each new rule kind", () => {
      const fixture = join(__dirname, "__fixtures__", "canvas-broken");
      const out = checkCanvas({
        canvasDir: fixture,
        theme: join(fixture, "theme.json"),
        stamp: join(fixture, "ds-stamp.json"),
        naming: true,
        boards: true,
      });
      for (const kind of [
        "literal colors",
        "provenance",
        "cl-",
        "padding",
        "border-radius",
        "$preview",
      ])
        expect(
          out.some((line) => line.includes(kind)),
          kind,
        ).toBe(true);
    });

    it("broken canvas reports each v1 colour name with its v2 rename", () => {
      const fixture = join(__dirname, "__fixtures__", "canvas-broken");
      const out = checkCanvas({
        canvasDir: fixture,
        theme: join(fixture, "theme.json"),
        naming: true,
      });
      const form = "<role>[Subtle][Border][Foreground][Hover|Active|Selected]";
      for (const [key, v2] of [
        ["okInk", "successForeground"],
        ["badSoft", "dangerSubtle"],
        ["line", "border"],
        ["onPrimary", "primaryForeground"],
      ] as const)
        expect(out).toContain(
          `${join(fixture, "theme.json")}:1 colors.${key} does not follow ${form} (rename to ${v2})`,
        );
    });
  });

  describe("--ds-version", () => {
    it("accepts the installed version", () => {
      writeBoards();
      expect(
        check({ dsVersion: { namespace: "BodyLog", version: "3" } }),
      ).toEqual([]);
    });

    it("reports another installed version", () => {
      writeBoards();
      expect(
        check({ dsVersion: { namespace: "BodyLog", version: "4" } }),
      ).toEqual(["canvas.json:1 design system BodyLog version 3, expected 4"]);
    });

    it("reports a design system that is not installed", () => {
      writeBoards();
      expect(
        check({ dsVersion: { namespace: "Other", version: "1" } }),
      ).toEqual(["canvas.json:1 design system Other is not installed"]);
    });

    it("reports a missing canvas.json once with boards", () => {
      board("<p>x</p>");
      expect(
        check({
          boards: true,
          dsVersion: { namespace: "BodyLog", version: "3" },
        }),
      ).toEqual(["canvas.json:1 missing canvas.json"]);
    });
  });

  describe("CLI flags", () => {
    it("CLI: --ds-version without = exits 2", async () => {
      board("<p>x</p>");
      expect((await cli("--ds-version", "bodylog")).status).toBe(2);
      expect((await cli("--ds-version", "a=b=c")).status).toBe(2);
      expect((await cli("--ds-version", "=1")).status).toBe(2);
    });

    it("CLI: --naming on a theme that follows the convention prints OK", async () => {
      useTheme(NAMED);
      board("<p>x</p>");
      const run = await cli("--naming");
      expect(run.status).toBe(0);
      expect(run.last).toMatch(/^OK: /);
    });

    it("CLI: --boards without canvas.json exits 1", async () => {
      board("<p>x</p>");
      const run = await cli("--boards");
      expect(run.status).toBe(1);
      expect(run.stdout).toContain("canvas.json:1 missing canvas.json");
    });

    it("CLI: --standard with --boards reads another manifest", async () => {
      const copy = structuredClone(STANDARD);
      const mau = copy.boards.find((b) => b.file === "ds-mau.dc.html");
      if (mau) mau.title = "X";
      const standard = writeTmpFile(dir, "standard.json", {
        ...(JSON.parse(readFileSync(standardFile, "utf8")) as object),
        boards: copy.boards,
      });
      writeBoards((c) => {
        entry(c.boards, "ds-mau.dc.html").title = "X";
      });
      const run = await cli("--boards", "--standard", standard);
      expect(run.status).toBe(0);
      expect(run.last).toMatch(/^OK: /);
    });

    const violationCount = /^\d+ violation\(s\)$/;

    it("CLI: a missing core board exits 1", async () => {
      writeBoards();
      unlinkSync(join(canvas, "ds-mau.dc.html"));
      const run = await cli("--boards");
      expect(run.status).toBe(1);
      expect(run.stdout).toContain("missing core board ds-mau.dc.html");
      expect(run.last).toMatch(violationCount);
    });

    it("CLI: a misnamed colour key exits 1", async () => {
      useTheme(named((t) => (t.colors.okInk = "#123")));
      board("<p>x</p>");
      const run = await cli("--naming");
      expect(run.status).toBe(1);
      expect(run.stdout).toContain("colors.okInk is not a primitive name");
      expect(run.last).toMatch(violationCount);
    });

    it("CLI: an inline font-weight exits 1", async () => {
      useTheme(NAMED);
      board('<b style="font-weight:600">x</b>');
      const run = await cli("--naming");
      expect(run.status).toBe(1);
      expect(run.stdout).toContain("font-weight 600 (use a typography class)");
      expect(run.last).toMatch(violationCount);
    });

    it("CLI: a primitive token on a screen exits 1", async () => {
      useTheme(NAMED);
      board(
        '<p style="color:var(--sg-color-blue-600)">x</p>',
        "screen.dc.html",
      );
      const run = await cli("--naming");
      expect(run.status).toBe(1);
      expect(run.stdout).toContain("primitive token --sg-color-blue-600");
      expect(run.last).toMatch(violationCount);
    });
  });
});
