import { describe, expect, it } from "vitest";

import { splitClass, themeFamilies } from "./boardInputs";
import {
  bypassedFamily,
  bypassExcepted,
  firstUses,
  namedFamilies,
} from "./tokenClasses";

const families = themeFamilies({
  colors: { primary: "#000" },
  fontFamily: { sans: "x" },
  opacity: { disabled: 0.4 },
  borderRadius: { md: "6px" },
  borderWidth: { thin: "1px" },
  shadows: { sm: "0 0 #000" },
  zIndex: { modal: 50 },
});

describe("splitClass", () => {
  it.each([
    ["flex", [], "flex"],
    ["disabled:opacity-50", ["disabled"], "opacity-50"],
    ["md:hover:-mt-1!", ["md", "hover"], "mt-1"],
    [
      "data-[state=open]:bg-[color:var(--x)]",
      ["data-[state=open]"],
      "bg-[color:var(--x)]",
    ],
  ])("%s", (candidate, variants, utility) => {
    expect(splitClass(candidate)).toEqual({ variants, utility });
  });
});

describe("namedFamilies", () => {
  it("names the family of a class that picks a value by name", () => {
    expect(namedFamilies("font-display", families).map((f) => f.key)).toEqual([
      "fontFamily",
    ]);
    expect(namedFamilies("md:rounded-md", families).map((f) => f.key)).toEqual([
      "borderRadius",
    ]);
    expect(namedFamilies("border-x-thin", families).map((f) => f.key)).toEqual([
      "borderWidth",
    ]);
    expect(namedFamilies("border-thin", families).map((f) => f.key)).toEqual([
      "colors",
      "borderWidth",
    ]);
  });

  it("leaves arbitrary, numeric, bare and unrelated classes alone", () => {
    for (const candidate of [
      "font-[inherit]",
      "opacity-50",
      "rounded",
      "flex",
      "p-4",
    ])
      expect(namedFamilies(candidate, families), candidate).toEqual([]);
  });
});

describe("bypassedFamily", () => {
  it.each([
    ["opacity-50", "opacity"],
    ["disabled:opacity-50", "opacity"],
    ["rounded-[6px]", "borderRadius"],
    ["z-50", "zIndex"],
    ["bg-[#fff]", "colors"],
    ["border-2", "borderWidth"],
    ["shadow-[0_1px_2px_#000]", "shadows"],
  ])("%s writes a raw %s value", (candidate, key) => {
    expect(bypassedFamily(candidate, families)?.key).toBe(key);
  });

  it.each([
    "opacity-disabled",
    "opacity-0",
    "opacity-100",
    "z-0",
    "border-0",
    "rounded",
    "shadow",
    "border",
    "z-modal",
    "rounded-md",
    "bg-primary",
    "bg-primary/50",
    "bg-[var(--sg-color-primary)]",
    "flex",
    "p-4",
    "h-[40px]",
  ])("%s reads a token or leaves every family", (candidate) => {
    expect(bypassedFamily(candidate, families)).toBeUndefined();
  });

  it("ignores a family the theme does not define", () => {
    expect(
      bypassedFamily("opacity-50", themeFamilies({ colors: { a: "#000" } })),
    ).toBeUndefined();
  });
});

describe("bypassExcepted", () => {
  const exceptions = [
    { class: "opacity-50", files: ["c-button.dc.html", "ds/**"] },
    { class: "z-10", files: ["*.dc.html"] },
  ];
  const use = (candidate: string, file: string) => ({
    file,
    line: 1,
    candidate,
  });

  it("matches the class as written or its bare utility, in a listed file", () => {
    expect(
      bypassExcepted(exceptions, use("opacity-50", "c-button.dc.html")),
    ).toBe(true);
    expect(
      bypassExcepted(exceptions, use("disabled:opacity-50", "ds/a/b.css")),
    ).toBe(true);
    expect(bypassExcepted(exceptions, use("z-10", "x.dc.html"))).toBe(true);
  });

  it("does not reach another class, another file or another folder", () => {
    expect(
      bypassExcepted(exceptions, use("opacity-40", "c-button.dc.html")),
    ).toBe(false);
    expect(bypassExcepted(exceptions, use("opacity-50", "other.dc.html"))).toBe(
      false,
    );
    expect(bypassExcepted(exceptions, use("z-10", "sub/x.dc.html"))).toBe(
      false,
    );
  });
});

describe("firstUses", () => {
  it("keeps the first use per file and class", () => {
    const a = { file: "a", line: 1, candidate: "flex" };
    expect(
      firstUses([
        a,
        { ...a, line: 9 },
        { ...a, file: "b" },
        { ...a, candidate: "p-1" },
      ]),
    ).toEqual([a, { ...a, file: "b" }, { ...a, candidate: "p-1" }]);
  });
});
