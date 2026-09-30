import { describe, it, expect, vi } from "vitest";

import type { ThemeConfig } from "../../core/themeSchema";

import type * as BuiltInCategories from "./builtInCategories";
import { generateSourceInline } from "./generateSourceInline";

// Swap the colors descriptor for one with a hypothetical camelCase state — the
// real `COLOR_STATES` stays `["hover", "active"]`. `vi.mock` is hoisted above
// the static import of `generateSourceInline`.
vi.mock("./builtInCategories", async (importOriginal) => {
  const actual = await importOriginal<typeof BuiltInCategories>();
  return {
    ...actual,
    builtInCategories: actual.builtInCategories.map((descriptor) =>
      descriptor.key === "colors"
        ? { ...descriptor, states: ["focusVisible"] }
        : descriptor,
    ),
  };
});

describe("generateSourceInline — state prefix", () => {
  it("emits a camelCase state kebab-cased (focus-visible:) while the sibling lookup stays camelKey + PascalState", () => {
    const theme: ThemeConfig = {
      colors: { primary: "#fff", primaryFocusVisible: "#eee" },
    };

    const css = generateSourceInline(theme, { spacing: { enabled: false } });

    expect(css).toContain(
      '@source inline("focus-visible:{bg,text,border}-{primary-focus-visible}");',
    );
    expect(css).not.toContain("focusVisible:");
  });
});
