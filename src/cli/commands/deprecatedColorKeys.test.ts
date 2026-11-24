import { describe, expect, it } from "vitest";

import { findDeprecatedColorKeys } from "./deprecatedColorKeys";

describe("findDeprecatedColorKeys", () => {
  it("warns on an on<Intent> key whose intent is a colour", () => {
    expect(
      findDeprecatedColorKeys({
        colors: {
          primary: "#000",
          onPrimary: "#fff",
          domainX: "#111",
          onDomainX: "#eee",
        },
      }),
    ).toEqual([
      "colors.onPrimary is deprecated: contrastText reads primaryForeground first and drops on<Intent> in 9.0; rename to primaryForeground",
      "colors.onDomainX is deprecated: contrastText reads domainXForeground first and drops on<Intent> in 9.0; rename to domainXForeground",
    ]);
  });

  it("asks for a merge when <intent>Foreground already exists", () => {
    expect(
      findDeprecatedColorKeys({
        colors: {
          primary: "#000",
          onPrimary: "#fff",
          primaryForeground: "#fff",
        },
      }),
    ).toEqual([
      "colors.onPrimary is deprecated: contrastText reads primaryForeground first and drops on<Intent> in 9.0; primaryForeground exists: merge onPrimary into it and remove onPrimary",
    ]);
  });

  it("leaves onboarding and an on<Name> without that colour alone", () => {
    expect(
      findDeprecatedColorKeys({
        colors: {
          onboarding: "#000",
          onCard: "#fff",
          primaryForeground: "#fff",
        },
      }),
    ).toEqual([]);
  });
});
