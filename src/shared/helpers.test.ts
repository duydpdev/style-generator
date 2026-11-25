import { describe, it, expect } from "vitest";

import { toKebabCase, toCamelCase } from "./helpers";

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
  it("first-char uppercase → lowercased", () => {
    expect(toCamelCase("Primary")).toBe("primary");
  });
  it("trailing separator produces no-op on tail", () => {
    expect(toCamelCase("primary-")).toBe("primary");
  });
});
