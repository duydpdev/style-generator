import { describe, expect, it } from "vitest";

import { selectedClasses } from "./compileCss";

const byCodeUnit = (a: string, b: string): number =>
  Number(a > b) - Number(a < b);
const names = (css: string): string[] =>
  [...selectedClasses(css)].sort(byCodeUnit);

describe("selectedClasses", () => {
  it("unescapes the class names the selectors name", () => {
    expect(
      names(
        String.raw`.hover\:bg-primary:hover { color: red; } .\32 xl\:grid-cols-2, .a > .b { top: 0 }`,
      ),
    ).toEqual(["2xl:grid-cols-2", "a", "b", "hover:bg-primary"]);
  });

  it("does not read a class out of a declaration value", () => {
    expect(
      names(
        ".p { margin: .25em; width: calc(var(--spacing) * .75); padding: 0.5rem }",
      ),
    ).toEqual(["p"]);
  });

  it("does not read a class out of a comment or an at-rule prelude", () => {
    expect(
      names(
        "/*! tailwindcss v4 | MIT License | https://tailwindcss.com */\n@media (min-width: 40.5rem) { .md\\:flex { display: flex } }\n@property --x { syntax: '*'; inherits: false }",
      ),
    ).toEqual(["md:flex"]);
  });

  it("reads a rule nested in another rule", () => {
    expect(
      names(".group { &:hover { .inner { color: red } } color: blue }"),
    ).toEqual(["group", "inner"]);
  });
});
