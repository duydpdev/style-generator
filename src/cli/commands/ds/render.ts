/**
 * Runs a design-system bundle against a fake React and renders every component
 * and variant, so the build can check the output it just wrote. `node:vm` here is
 * a harness for our own assembled output, not a sandbox for the product preset.
 */
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
  // The bundle this command just assembled, run in a separate context; never external input.
  // eslint-disable-next-line sonarjs/code-eval
  vm.runInContext(code, ctx);
  const lib = ctx[namespace] as Record<string, Component> | undefined;
  if (lib === undefined) throw new Error(`window.${namespace} is not defined`);
  const trees: Record<string, unknown> = {};
  for (const [name, label, props] of cases(intents)) {
    const component = lib[name];
    if (typeof component !== "function")
      throw new Error(`window.${namespace}.${name} is not a function`);
    trees[`${name}:${label}`] = JSON.parse(
      JSON.stringify(component(props), (_key, value: unknown) =>
        typeof value === "function" ? "[function]" : value,
      ),
    );
  }
  return trees;
}

/**
 * Every class a rendered element tree names, split on whitespace.
 * @param {Record<string, unknown>} trees - `renderTrees` output
 * @returns {Set<string>} Distinct class names
 */
export function renderedClasses(trees: Record<string, unknown>): Set<string> {
  const classes = new Set<string>();
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (node === null || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (key === "className" && typeof value === "string") {
        for (const name of value.split(/\s+/))
          if (name !== "") classes.add(name);
      } else {
        visit(value);
      }
    }
  };
  visit(Object.values(trees));
  return classes;
}
