import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CanvasInputError } from "./scan";
import {
  AdditionsSchema,
  FULL_COPY_NOTICE,
  additionsFromFullCopy,
  layerStandard,
  loadStandard,
  type LoadedStandard,
} from "./standardLayer";
import { packagedStandard } from "./standardSchema";

const DEFAULT_STANDARD = packagedStandard();

const base = DEFAULT_STANDARD;

describe("layerStandard", () => {
  it("appends product boards and pages after the packaged ones", () => {
    const layered = layerStandard(base, {
      pages: [{ id: "app", name: "04 · App" }],
      boards: [{ file: "home.dc.html", page: "app", title: "Board / Home" }],
    });
    expect(layered.boards.slice(0, base.boards.length)).toEqual(base.boards);
    expect(layered.boards.at(-1)?.file).toBe("home.dc.html");
    expect(layered.pages.at(-1)?.id).toBe("app");
  });

  it("never replaces a packaged board or page of the same name", () => {
    const first = base.boards[0];
    const layered = layerStandard(base, {
      boards: [{ file: first?.file ?? "", page: "x", title: "Other" }],
      pages: [{ id: base.pages[0]?.id ?? "", name: "Other" }],
    });
    expect(layered.boards).toEqual(base.boards);
    expect(layered.pages).toEqual(base.pages);
  });

  it("merges product content under the packaged content", () => {
    const layered = layerStandard(base, {
      content: {
        "home.dc.html": { sections: ["hero"], literals: [] },
        "ds-mau.dc.html": { sections: ["x"], literals: [] },
      },
    });
    expect(layered.content?.["home.dc.html"]?.sections).toEqual(["hero"]);
    expect(layered.content?.["ds-mau.dc.html"]).toEqual(
      base.content?.["ds-mau.dc.html"],
    );
  });

  it("leaves every packaged rule, scale and grammar list untouched", () => {
    const layered = layerStandard(base, {
      roles: { domain: { description: "Domain accent." } },
      alphaScale: [8, 12],
    });
    expect(layered.rules).toBe(base.rules);
    expect(layered.scales).toBe(base.scales);
    expect(layered.grammar).toBe(base.grammar);
    expect(layered.roles).toEqual({
      domain: { description: "Domain accent." },
    });
  });

  it("keeps alphaScale", () => {
    expect(layerStandard(base, { alphaScale: [8, 12, 16] }).alphaScale).toEqual(
      [8, 12, 16],
    );
  });
});

describe("AdditionsSchema", () => {
  it.each([
    ["scaleSteps", { scaleSteps: { zIndex: { top: { reason: "" } } } }],
    ["exemptions", { exemptions: [{ rule: "r", name: "n", reason: " " }] }],
    ["reserved", { reserved: { brand: { reason: "" } } }],
    ["disabledRules", { disabledRules: { "token-unused": { reason: "" } } }],
    [
      "exceptions.contrast",
      { exceptions: { contrast: [{ pair: "a/b", reason: "" }] } },
    ],
    [
      "exceptions.bypass",
      { exceptions: { bypass: [{ class: "p-3", files: ["a"], reason: "" }] } },
    ],
  ])("rejects an empty reason in %s", (_name, value) => {
    const result = AdditionsSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("must not be empty");
  });

  it("rejects a key it does not know", () => {
    expect(AdditionsSchema.safeParse({ disabledrules: {} }).success).toBe(
      false,
    );
  });

  it("accepts a role with an empty description for the check to report", () => {
    expect(
      AdditionsSchema.safeParse({ roles: { domain: { description: "" } } })
        .success,
    ).toBe(true);
  });
});

describe("loadStandard", () => {
  let dir: string;
  const write = (value: unknown): string => {
    const file = join(dir, "canvas-standard.json");
    writeFileSync(file, JSON.stringify(value));
    return file;
  };
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sg-standard-layer-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("layers an additions file without a notice", () => {
    const loaded = loadStandard(write({ alphaScale: [8] }), "s.json");
    expect(loaded.notices).toEqual([]);
    expect(loaded.standard.alphaScale).toEqual([8]);
    expect(loaded.standard.grammar).toEqual(base.grammar);
  });

  it("names the path of an empty reason and exits through CanvasInputError", () => {
    const file = write({ reserved: { brand: { reason: "" } } });
    expect(() => loadStandard(file, "s.json")).toThrow(CanvasInputError);
    expect(() => loadStandard(file, "s.json")).toThrow(
      "s.json: reserved.brand.reason must not be empty",
    );
  });

  it("converts a full copy in memory and prints the notice once", () => {
    const loaded = loadStandard(
      write({
        semanticCore: [...base.semanticCore],
        grammar: {
          ...base.grammar,
          roles: [...(base.grammar?.roles ?? []), "domain"],
        },
        boards: [
          ...base.boards,
          { file: "home.dc.html", page: "ds", title: "Board / Home" },
        ],
        alphaScale: [8, 12],
      }),
      "s.json",
    );
    expect(loaded.notices).toEqual([FULL_COPY_NOTICE]);
    expect(loaded.standard.roles).toEqual({ domain: { description: "" } });
    expect(loaded.standard.boards.at(-1)?.file).toBe("home.dc.html");
    expect(loaded.standard.alphaScale).toEqual([8, 12]);
  });

  it.each([
    ["an empty semanticCore", { semanticCore: [] }],
    ["no grammar", { semanticCore: ["background"], weights: {} }],
    ["an emptied grammar", { grammar: { neutral: [], roles: [] } }],
    ["an emptied rules object", { rules: {} }],
    ["an emptied scales object", { scales: {} }],
  ])("a full copy with %s still yields the packaged standard", (_n, copy) => {
    const { standard } = loadStandard(write(copy), "s.json");
    expect(standard.semanticCore).toEqual(base.semanticCore);
    expect(standard.grammar).toEqual(base.grammar);
    expect(standard.rules).toEqual(base.rules);
    expect(standard.scales).toEqual(base.scales);
    expect(standard.boards).toEqual(base.boards);
  });
});

describe("additionsFromFullCopy", () => {
  it("returns nothing for a copy that adds nothing", () => {
    expect(
      additionsFromFullCopy(
        { semanticCore: [...base.semanticCore], boards: base.boards },
        base,
        "s.json",
      ),
    ).toEqual({});
  });

  it("throws, naming the path, for a copy whose surviving parts are malformed", () => {
    expect(() =>
      additionsFromFullCopy({ boards: "no" }, base, "s.json"),
    ).toThrow(CanvasInputError);
    expect(() =>
      additionsFromFullCopy({ boards: "no" }, base, "s.json"),
    ).toThrow(/^s\.json: boards /);
  });
});

describe("loadStandard validation", () => {
  let dir: string;
  const load = (value: unknown): LoadedStandard => {
    const file = join(dir, "s.json");
    writeFileSync(file, JSON.stringify(value));
    return loadStandard(file, "s.json");
  };
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "sg-standard-valid-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects a file that mixes manifest-only and additions-only keys, naming both", () => {
    expect(() =>
      load({ descriptions: {}, roles: { domain: { description: "x" } } }),
    ).toThrow(
      "s.json: descriptions belong to a full copy and roles to an additions file; keep one form",
    );
  });

  it("rejects a malformed full copy instead of reading it as empty", () => {
    expect(() => load({ semanticCore: [], boards: "no" })).toThrow(
      /^s\.json: boards /,
    );
  });

  it.each([
    ["a packaged role", "primary", /is a packaged name/],
    ["a neutral key", "border", /is a packaged name/],
    ["a deprecated name", "okInk", /is not a valid role name/],
    ["an on-prefix", "onPrimary", /is not a valid role name/],
    ["a trailing state", "brandHover", /is not a valid role name/],
  ])("rejects %s as a declared role", (_n, role, message) => {
    expect(() => load({ roles: { [role]: { description: "x" } } })).toThrow(
      message,
    );
  });

  it("rejects an unknown scale family, rule id and exemption rule", () => {
    expect(() =>
      load({ scaleSteps: { padding: { huge: { reason: "r" } } } }),
    ).toThrow(/scaleSteps\.padding is not a scale family/);
    expect(() =>
      load({ disabledRules: { "no-such-rule": { reason: "r" } } }),
    ).toThrow(/disabledRules\.no-such-rule is not a rule id/);
    expect(() =>
      load({ exemptions: [{ rule: "nope", name: "n", reason: "r" }] }),
    ).toThrow(/exemptions\.0\.rule nope is not a rule id/);
  });

  it("accepts a known family, rule id and a declared role", () => {
    expect(() =>
      load({
        roles: { domainNutrition: { description: "" } },
        scaleSteps: { controlHeight: { pill: { reason: "r" } } },
        disabledRules: { "token-unused": { reason: "r" } },
        exemptions: [{ rule: "scale-name", name: "n", reason: "r" }],
      }),
    ).not.toThrow();
  });

  it("requires a bypass exception to name a file", () => {
    expect(() =>
      load({
        exceptions: { bypass: [{ class: "p-3", files: [], reason: "r" }] },
      }),
    ).toThrow(/exceptions\.bypass\.0\.files must name a file/);
  });

  it("reports every problem, not only the first", () => {
    expect(() =>
      load({
        scaleSteps: { a: { b: { reason: "" } }, c: { d: { reason: "" } } },
      }),
    ).toThrow(
      "s.json: scaleSteps.a.b.reason must not be empty; scaleSteps.c.d.reason must not be empty",
    );
  });
});
