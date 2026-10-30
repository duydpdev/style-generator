import { presets, tokens } from "design-system-example";
import { describe, it } from "vitest";

import { createUi, type UiPresets } from "../src";

import { layoutOnly } from "./ui";

describe("optional roles", () => {
  it("an omitted role is not on the type", () => {
    const noButton = createUi(tokens, { card: presets.card });
    void noButton.Card;
    // @ts-expect-error Button exists only when presets.button is provided
    void noButton.Button;
    // @ts-expect-error no control role at all
    void layoutOnly.Dialog;
    void layoutOnly.Text;
    const dropped = createUi(tokens, { ...presets, button: undefined });
    // @ts-expect-error a role set to undefined is not provided
    void dropped.Button;
  });
  it("presets are checked against the app's tokens", () => {
    // @ts-expect-error nope is not a colour key
    createUi(tokens, { card: { ...presets.card, surface: "nope" } });
    createUi(tokens, {
      // @ts-expect-error focusRing must cover every intent
      button: { ...presets.button, focusRing: { primary: "x" } },
    });
  });
  it("a second theme types its own keys", () => {
    const alt = createUi(altTokens, altPresets);
    void (<alt.Box backgroundColor="paper" />);
    // @ts-expect-error surface is a design-system key, not this theme's
    void (<alt.Box backgroundColor="surface" />);
    void (<alt.Flex gap={{ xl: 4 }} />);
    // @ts-expect-error px is not in this theme's spacingProperties
    void (<alt.Box px={2} />);
    void (<alt.Button color="brand" />);
  });
});

declare const altTokens: {
  readonly colors: readonly ("paper" | "ink" | "brand")[];
  readonly typography: readonly "body"[];
  readonly shadows: readonly never[];
  readonly backDropBlurs: readonly never[];
  readonly borderRadius: readonly "md"[];
  readonly borderWidth: readonly never[];
  readonly spacingProperties: readonly ("p" | "gap")[];
  readonly breakpoints: readonly ("md" | "lg" | "xl")[];
};
declare const altPresets: {
  readonly button: UiPresets<typeof altTokens, "brand">["button"] & object;
};
