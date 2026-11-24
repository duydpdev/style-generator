import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, unlinkSync } from "node:fs";
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
    stamp?: string | undefined;
    intents?: readonly string[] | undefined;
    naming?: boolean | undefined;
    boards?: boolean | undefined;
    standard?: string | undefined;
    dsVersion?: { namespace: string; version: string } | undefined;
  }) => string[];
}

interface Standard {
  boards: { file: string; page: string; title: string }[];
  pages: { id: string; name: string }[];
}

interface NamedTheme {
  colors: Record<string, string>;
  typography: Record<string, Record<string, string | number>>;
  borderRadius: Record<string, string>;
  themeAxes: { theme: { dark: { colors: Record<string, string> } } };
}

const repoRoot = join(__dirname, "..", "..");
const script = join(repoRoot, "scripts", "check-design-canvas.mjs");
const standardFile = join(repoRoot, "scripts", "design-canvas-standard.json");
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
    border: "$gray100",
    primary: "$blue600",
    primaryHover: "$blue700",
    primaryActive: "$blue800",
    onPrimary: "$white",
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
  const check = (
    extra: {
      stamp?: string | undefined;
      intents?: string[] | undefined;
      naming?: boolean | undefined;
      boards?: boolean | undefined;
      standard?: string | undefined;
      dsVersion?: { namespace: string; version: string } | undefined;
    } = {},
  ) => mod.checkCanvas({ canvasDir: canvas, theme, ...extra });
  const useTheme = (value: object): void => {
    theme = writeTmpFile(dir, "theme.json", value);
  };
  const cli = (...args: string[]) => {
    const run = spawnSync(
      process.execPath,
      [script, "--canvas", canvas, "--theme", theme, ...args],
      { encoding: "utf8" },
    );
    return {
      status: run.status,
      stdout: run.stdout,
      last: run.stdout.trim().split("\n").at(-1) ?? "",
    };
  };
  interface CanvasJson {
    pages: { id: string; name: string }[];
    boards: Record<string, { title: string; page: string }>;
    order: string[];
    designSystems: { namespace: string; version: string }[];
  }
  /**
   * Writes a canvas with the manifest's pages, core boards and component
   * boards, after `edit` changes its `canvas.json`.
   * @param {(c: CanvasJson) => void} edit - Change to `canvas.json`
   */
  const writeBoards = (
    edit: (c: CanvasJson) => void = () => undefined,
  ): void => {
    const json: CanvasJson = {
      pages: STANDARD.pages.map((p) => ({ ...p })),
      boards: {},
      order: [],
      designSystems: [{ namespace: "BodyLog", version: "3" }],
    };
    for (const b of STANDARD.boards) {
      json.boards[b.file] = { title: b.title, page: b.page };
      json.order.push(b.file);
    }
    for (const file of COMPONENT_BOARDS) {
      json.boards[file] = { title: `Component / ${file}`, page: "cl" };
      json.order.push(file);
    }
    edit(json);
    for (const file of json.order) board("<p>x</p>", file);
    writeTmpFile(canvas, "canvas.json", json);
  };

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
      const inv = mod.inventoryCanvas(canvas) as Inventory & {
        fontWeights: { value: string }[];
      };
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
        (t) => (t.colors.okInk = "#123"),
        "colors.okInk is not a primitive name and not an alias of a primitive",
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
    it("CLI: --ds-version without = exits 2", () => {
      board("<p>x</p>");
      expect(cli("--ds-version", "bodylog").status).toBe(2);
      expect(cli("--ds-version", "a=b=c").status).toBe(2);
      expect(cli("--ds-version", "=1").status).toBe(2);
    });

    it("CLI: --naming on a theme that follows the convention prints OK", () => {
      useTheme(NAMED);
      board("<p>x</p>");
      const run = cli("--naming");
      expect(run.status).toBe(0);
      expect(run.last).toMatch(/^OK: /);
    });

    it("CLI: --boards without canvas.json exits 1", () => {
      board("<p>x</p>");
      const run = cli("--boards");
      expect(run.status).toBe(1);
      expect(run.stdout).toContain("canvas.json:1 missing canvas.json");
    });

    it("CLI: --standard with --boards reads another manifest", () => {
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
      const run = cli("--boards", "--standard", standard);
      expect(run.status).toBe(0);
      expect(run.last).toMatch(/^OK: /);
    });

    const violationCount = /^\d+ violation\(s\)$/;

    it("CLI: a missing core board exits 1", () => {
      writeBoards();
      unlinkSync(join(canvas, "ds-mau.dc.html"));
      const run = cli("--boards");
      expect(run.status).toBe(1);
      expect(run.stdout).toContain("missing core board ds-mau.dc.html");
      expect(run.last).toMatch(violationCount);
    });

    it("CLI: a misnamed colour key exits 1", () => {
      useTheme(named((t) => (t.colors.okInk = "#123")));
      board("<p>x</p>");
      const run = cli("--naming");
      expect(run.status).toBe(1);
      expect(run.stdout).toContain("colors.okInk is not a primitive name");
      expect(run.last).toMatch(violationCount);
    });

    it("CLI: an inline font-weight exits 1", () => {
      useTheme(NAMED);
      board('<b style="font-weight:600">x</b>');
      const run = cli("--naming");
      expect(run.status).toBe(1);
      expect(run.stdout).toContain("font-weight 600 (use a typography class)");
      expect(run.last).toMatch(violationCount);
    });

    it("CLI: a primitive token on a screen exits 1", () => {
      useTheme(NAMED);
      board(
        '<p style="color:var(--sg-color-blue-600)">x</p>',
        "screen.dc.html",
      );
      const run = cli("--naming");
      expect(run.status).toBe(1);
      expect(run.stdout).toContain("primitive token --sg-color-blue-600");
      expect(run.last).toMatch(violationCount);
    });
  });
});
