import { presets, tokens } from "design-system-example";
import { createSSRApp, h, type Component } from "vue";
import { renderToString } from "vue/server-renderer";
import { expect } from "vitest";

import { createUi } from "../src/createUi";

export const ui = createUi(tokens, presets);
/** Layout only: no control role. */
export const layoutOnly = createUi(tokens, {});

/** Server-render `component` with `props` and a default slot. */
export const render = (
  component: Component,
  props: Record<string, unknown> = {},
  slot = "x",
): Promise<string> =>
  renderToString(
    createSSRApp({ render: () => h(component, props, () => slot) }),
  );

/** Server-render `component` with named slots. */
export const renderSlots = (
  component: Component,
  slots: Record<string, () => string>,
): Promise<string> =>
  renderToString(createSSRApp({ render: () => h(component, null, slots) }));

/** Every class of every `class="…"` attribute in `html`. */
const classesOf = (html: string): Set<string> =>
  new Set(
    [...html.matchAll(/class="([^"]*)"/g)].flatMap(([, value]) =>
      (value ?? "").split(" "),
    ),
  );

/** `html` renders every class `recipeClass` lists. */
export const expectRecipe = (html: string, recipeClass: string): void => {
  const present = classesOf(html);
  const expected = recipeClass.split(" ").filter((c) => c !== "");
  expect(expected.length).toBeGreaterThan(0);
  for (const className of expected) expect(present).toContain(className);
};

export const byName = (a: string, b: string): number => a.localeCompare(b);
