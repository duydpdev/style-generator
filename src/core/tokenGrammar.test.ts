import { describe, expect, it } from "vitest";

import { parseAlias } from "./tokenGrammar";

describe("parseAlias", () => {
  it.each([
    ["$blue500", "blue500"],
    ["$2xl", "2xl"],
    ["$blue-500", "blue-500"],
  ])("%s → %s", (value, target) => {
    expect(parseAlias(value)).toBe(target);
  });

  it.each(["#fff", "$", "$a b", "x$a"])("%j is not an alias", (value) => {
    expect(parseAlias(value)).toBeUndefined();
  });
});
