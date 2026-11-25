import { describe, expect, it } from "vitest";

import { selectorTargetsClass } from "./compileFixtureCss";

describe("selectorTargetsClass", () => {
  it.each([
    [".bg-primary", ".bg-primary", true],
    [".hover\\:bg-primary:hover", ".hover\\:bg-primary", true],
    [
      '.aria-selected\\:bg-primary-selected[aria-selected="true"]',
      ".aria-selected\\:bg-primary-selected",
      true,
    ],
    [":where(.divide-x > :not(:last-child))", ".divide-x", true],
    [".placeholder-x::placeholder", ".placeholder-x", true],
    [".a, .bg-primary", ".bg-primary", true],
    [".bg-primary\\[x\\]", ".bg-primary", false],
    [".bg-primary-selected[aria-selected]", ".bg-primary", false],
    [".bg-primary\\/50", ".bg-primary", false],
    [".divide-x-reverse", ".divide-x", false],
    ['[data-c=".bg-primary"]', ".bg-primary", false],
    [".x\\.bg-primary", ".bg-primary", false],
  ])("%s targets %s: %s", (selector, classSelector, expected) => {
    expect(selectorTargetsClass(selector, classSelector)).toBe(expected);
  });
});
