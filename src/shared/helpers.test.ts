import { describe, it, expect } from "vitest";

import {
  toKebabCase,
  toCamelCase,
  toPascalCase,
  extractData,
  addDot,
} from "./helpers";

describe("toKebabCase", () => {
  it("camelCase → kebab", () => {
    expect(toKebabCase("primaryForeground")).toBe("primary-foreground");
  });
  it("letter→digit boundary adds dash", () => {
    expect(toKebabCase("blue500")).toBe("blue-500");
  });
  it("digit→letter boundary adds dash", () => {
    expect(toKebabCase("500Blue")).toBe("500-blue");
  });
  it("simple lowercase stays", () => {
    expect(toKebabCase("primary")).toBe("primary");
  });
});

describe("toCamelCase", () => {
  it("kebab-case → camel", () => {
    expect(toCamelCase("sidebar-foreground")).toBe("sidebarForeground");
  });
  it("snake_case → camel", () => {
    expect(toCamelCase("sidebar_foreground")).toBe("sidebarForeground");
  });
  it("space-separated → camel", () => {
    expect(toCamelCase("sidebar foreground")).toBe("sidebarForeground");
  });
  it("first-char uppercase → lowercased", () => {
    expect(toCamelCase("Primary")).toBe("primary");
  });
  it("trailing separator produces no-op on tail", () => {
    expect(toCamelCase("primary-")).toBe("primary");
  });
});

describe("toPascalCase", () => {
  it("kebab → pascal", () => {
    expect(toPascalCase("sidebar-foreground")).toBe("SidebarForeground");
  });
  it("snake → pascal", () => {
    expect(toPascalCase("sidebar_foreground")).toBe("SidebarForeground");
  });
  it("already-cased first letter stays uppercase", () => {
    expect(toPascalCase("Primary")).toBe("Primary");
  });
  it("lowercase → capitalised", () => {
    expect(toPascalCase("primary")).toBe("Primary");
  });
});

describe("extractData", () => {
  it("kebab-cases keys preserving values", () => {
    expect(
      extractData({ primaryForeground: "#fff", blue500: "#00f" }),
    ).toStrictEqual({ "primary-foreground": "#fff", "blue-500": "#00f" });
  });
  it("empty object → empty", () => {
    expect(extractData({})).toStrictEqual({});
  });
});

describe("addDot", () => {
  it("prefixes each key with '.' + kebab-case", () => {
    expect(addDot({ heading1: { fontSize: "32px" } })).toStrictEqual({
      ".heading-1": { fontSize: "32px" },
    });
  });
  it("empty object → empty", () => {
    expect(addDot({})).toStrictEqual({});
  });
});
