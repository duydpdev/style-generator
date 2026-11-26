import vm from "node:vm";

/** The element a fake `createElement` returns: enough to compare what a component renders. */
export interface FakeElement {
  type: unknown;
  props: Record<string, unknown> | null;
}

type Component = (props: Record<string, unknown>) => unknown;

/**
 * Props that exercise each component, one entry per rendered variant.
 * @param {readonly string[]} intents - The Button preset's intents
 * @returns {[string, string, Record<string, unknown>][]} Component, label and props per case
 */
function cases(
  intents: readonly string[],
): [string, string, Record<string, unknown>][] {
  const out: [string, string, Record<string, unknown>][] = [
    ["Box", "default", { children: "x" }],
    ["Box", "padding", { p: "md", children: "x" }],
    ["Text", "default", { children: "x" }],
    ["Stack", "default", { children: "x" }],
    ["Flex", "default", { children: "x" }],
    ["Grid", "default", { children: "x" }],
  ];
  for (const color of intents)
    for (const variant of ["solid", "outline", "soft", "ghost", "link"])
      for (const size of ["sm", "md", "lg"])
        out.push([
          "Button",
          `${color}/${variant}/${size}`,
          { color, variant, size, children: "x" },
        ]);
  return out;
}

/**
 * Runs a design-system bundle against a fake React and renders every component and variant.
 * @param {string} code - The bundle
 * @param {string} namespace - The bundle's global name
 * @param {readonly string[]} intents - The Button preset's intents
 * @returns {Record<string, unknown>} The element tree per `<component>:<variant>`, JSON-safe
 */
export function renderTrees(
  code: string,
  namespace: string,
  intents: readonly string[],
): Record<string, unknown> {
  const ctx: Record<string, unknown> = {
    React: {
      createElement: (
        type: unknown,
        props: Record<string, unknown> | null,
        ...children: unknown[]
      ): FakeElement => ({
        type,
        props: children.length === 0 ? props : { ...props, children: children },
      }),
      Fragment: "fragment",
      isValidElement: () => false,
    },
    ReactDOM: {},
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  // The bundle is this repo's own build output, run in an isolated context.
  // eslint-disable-next-line sonarjs/code-eval
  vm.runInContext(code, ctx);
  const lib = ctx[namespace] as Record<string, Component>;
  const trees: Record<string, unknown> = {};
  for (const [name, label, props] of cases(intents)) {
    const component = lib[name];
    if (component === undefined)
      throw new Error(`${name} is not in the bundle`);
    trees[`${name}:${label}`] = JSON.parse(
      JSON.stringify(component(props), (_key, value: unknown) =>
        typeof value === "function" ? "[function]" : value,
      ),
    );
  }
  return trees;
}

/**
 * Orders two strings by UTF-16 code unit, the order `Array#sort` uses by default.
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Negative, zero or positive
 */
function compareCodeUnits(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * The class names a stylesheet selects, sorted: its selector set.
 * @param {string} css - A compiled stylesheet
 * @returns {string[]} Distinct class names, unescaped
 */
export function selectorSet(css: string): string[] {
  const names = new Set<string>();
  for (const m of css.matchAll(/\.((?:\\[\da-f]{1,6} ?|\\.|[\w-])+)/gi))
    names.add(
      (m[1] ?? "")
        .replace(/\\([\da-f]{1,6}) ?/gi, (_whole, hex: string) =>
          String.fromCodePoint(Number.parseInt(hex, 16)),
        )
        .replace(/\\(.)/g, "$1"),
    );
  return [...names].sort(compareCodeUnits);
}
