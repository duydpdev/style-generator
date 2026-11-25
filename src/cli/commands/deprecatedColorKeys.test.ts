import { describe, expect, it } from "vitest";

import { COLOR_STATES } from "../../shared/colorStates";

import { DEFAULT_STANDARD } from "./canvas/standardSchema";
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
      "colors.onPrimary is no longer read by contrastText in 9.0; rename to primaryForeground",
      "colors.onDomainX is no longer read by contrastText in 9.0; rename to domainXForeground",
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
      "colors.onPrimary is no longer read by contrastText in 9.0; primaryForeground exists: merge onPrimary into it and remove onPrimary",
    ]);
  });

  it("puts the state last for an on<Intent><State> key", () => {
    expect(
      findDeprecatedColorKeys({
        colors: {
          primary: "#000",
          primaryHover: "#111",
          onPrimaryHover: "#fff",
          danger: "#f00",
          dangerActive: "#e00",
          onDangerActive: "#fff",
          dangerForegroundActive: "#fff",
        },
      }),
    ).toEqual([
      "colors.onPrimaryHover is a state of onPrimary, which contrastText no longer reads in 9.0 (the state goes last); rename to primaryForegroundHover",
      "colors.onDangerActive is a state of onDanger, which contrastText no longer reads in 9.0 (the state goes last); dangerForegroundActive exists: merge onDangerActive into it and remove onDangerActive",
    ]);
  });

  it("leaves onboarding and an on<Name> without that colour alone", () => {
    expect(
      findDeprecatedColorKeys({
        colors: {
          onboarding: "#000",
          onCard: "#fff",
          onHover: "#fff",
          onSelected: "#fff",
          onSecondaryHover: "#fff",
          primaryForeground: "#fff",
        },
      }),
    ).toEqual([]);
  });

  it("warns on an on<Intent><State> key when only the bare intent is a colour", () => {
    expect(
      findDeprecatedColorKeys({
        colors: { primary: "#000", onPrimary: "#fff", onPrimaryHover: "#eee" },
      }),
    ).toEqual([
      "colors.onPrimary is no longer read by contrastText in 9.0; rename to primaryForeground",
      "colors.onPrimaryHover is a state of onPrimary, which contrastText no longer reads in 9.0 (the state goes last); rename to primaryForegroundHover",
    ]);
  });

  it("uses the same states as COLOR_STATES", () => {
    expect(DEFAULT_STANDARD.grammar?.states).toEqual(
      COLOR_STATES.map((row) => row.suffix),
    );
  });
});
