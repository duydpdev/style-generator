import { describe, expect, it } from "vitest";

import { cssBlock } from "./cssBlock";

describe("cssBlock", () => {
  it("puts the body between the braces on its own lines", () => {
    expect(cssBlock(":root", "  --a: 1;\n  --b: 2;")).toBe(
      ":root {\n  --a: 1;\n  --b: 2;\n}",
    );
  });

  it("indents the head and the closing brace, not the body", () => {
    expect(cssBlock("@media (width >= 48rem)", "    gap: 1px;", "  ")).toBe(
      "  @media (width >= 48rem) {\n    gap: 1px;\n  }",
    );
  });

  it("nests by passing an indented inner block as the body", () => {
    expect(
      cssBlock("@layer base", cssBlock(":root", "    --a: 1;", "  ")),
    ).toBe("@layer base {\n  :root {\n    --a: 1;\n  }\n}");
  });

  it("keeps an empty body as one blank line", () => {
    expect(cssBlock("x", "")).toBe("x {\n\n}");
  });
});
