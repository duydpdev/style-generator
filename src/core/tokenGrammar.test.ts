import { describe, expect, it } from "vitest";

import { parseAlias, parseAliasRef } from "./tokenGrammar";

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

describe("parseAliasRef", () => {
  it.each([
    ["$navy700", { key: "navy700" }],
    ["$navy700/8", { key: "navy700", alpha: 8 }],
    ["$black/60", { key: "black", alpha: 60 }],
    ["$navy700/1", { key: "navy700", alpha: 1 }],
    ["$navy700/100", { key: "navy700", alpha: 100 }],
    ["$blue-500/45", { key: "blue-500", alpha: 45 }],
  ])("%s → %j", (value, ref) => {
    expect(parseAliasRef(value)).toEqual(ref);
    expect(parseAlias(value)).toBe(ref.key);
  });

  it.each([
    "$navy700/0",
    "$navy700/101",
    "$navy700/08",
    "$navy700/8.5",
    "$navy700/",
    "$navy700/8/2",
    "$navy700 /8",
    "$navy700/ 8",
    "$/8",
  ])("%j is not an alias", (value) => {
    expect(parseAliasRef(value)).toBeUndefined();
    expect(parseAlias(value)).toBeUndefined();
  });
});
