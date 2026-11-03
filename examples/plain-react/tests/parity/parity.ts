import { createElement, type ComponentType, type ReactNode } from "react";
import { render } from "vitest-browser-react";

/** Props of one parity case, built at runtime from the plain `style.ts` tables. */
export type CaseProps = Readonly<Record<string, unknown>>;

/** One row of a parity table: the test name and the props both components get. */
export interface ParityCase {
  readonly name: string;
  readonly props: CaseProps;
}

/** The part of a `style.ts` tables object the generator reads. */
export interface CaseTables {
  readonly variants: Readonly<
    Record<string, Readonly<Record<string, unknown>>>
  >;
  readonly compoundVariants?:
    | readonly Readonly<Record<string, unknown>>[]
    | undefined;
}

/** cva option keys are strings; a boolean variant's options are "true"/"false". */
const propValue = (option: unknown): unknown => {
  if (option === "true") return true;
  if (option === "false") return false;
  return option;
};

const describeProps = (props: CaseProps): string =>
  Object.entries(props)
    .map(
      ([key, value]) =>
        `${key}=${typeof value === "object" ? JSON.stringify(value) : String(value as string | number | boolean | undefined)}`,
    )
    .join(" ");

const toCases = (list: readonly CaseProps[]): ParityCase[] =>
  list.map((props) => ({ name: describeProps(props), props }));

/** One case per variant option, then one per compound entry (its condition props); `keep` drops variants that are not props. */
export const variantCases = (
  tables: CaseTables,
  keep: (variant: string) => boolean = () => true,
): ParityCase[] => {
  const single = Object.entries(tables.variants)
    .filter(([variant]) => keep(variant))
    .flatMap(([variant, options]) =>
      Object.keys(options).map((option) => ({ [variant]: propValue(option) })),
    );
  const compound = (tables.compoundVariants ?? []).map((entry) =>
    Object.fromEntries(
      Object.entries(entry)
        .filter(([key]) => key !== "class" && key !== "className")
        .map(([key, value]) => [key, propValue(value)]),
    ),
  );
  return toCases([...single, ...compound]);
};

/** Everything the two sides of a parity file must agree on: variant names, sorted option keys, compound conditions. */
export interface TableShape {
  readonly variants: Readonly<Record<string, readonly string[]>>;
  readonly compound: readonly string[];
}

const byName = (a: string, b: string): number => a.localeCompare(b);

/** The comparable shape of a tables object; `keep` limits it to the variants that are props. */
export const tableShape = (
  tables: CaseTables,
  keep: (variant: string) => boolean = () => true,
): TableShape => ({
  variants: Object.fromEntries(
    Object.entries(tables.variants)
      .filter(([variant]) => keep(variant))
      .sort(([a], [b]) => byName(a, b))
      .map(([variant, options]) => [
        variant,
        Object.keys(options).sort(byName),
      ]),
  ),
  compound: (tables.compoundVariants ?? [])
    .map((entry) =>
      JSON.stringify(
        Object.entries(entry)
          .filter(([key]) => key !== "class" && key !== "className")
          .sort(([a], [b]) => byName(a, b)),
      ),
    )
    .sort(byName),
});

/** Cases of several sides, de-duplicated by name: an option that exists on one side only is still rendered on both. */
export const unionCases = (
  ...lists: readonly (readonly ParityCase[])[]
): ParityCase[] => {
  const seen = new Map<string, ParityCase>();
  for (const list of lists) {
    for (const item of list) {
      if (!seen.has(item.name)) seen.set(item.name, item);
    }
  }
  return [...seen.values()];
};

/** Two cases per spacing property (camelCased): `4`, and `{ base: 2, <bp>: 4, 6, … }`. */
export const spacingCases = (tokens: {
  readonly spacingProperties: readonly string[];
  readonly breakpoints: readonly string[];
}): ParityCase[] => {
  const responsive: Record<string, number> = { base: 2 };
  tokens.breakpoints.forEach((bp, index) => {
    responsive[bp] = 4 + 2 * index;
  });
  return toCases(
    tokens.spacingProperties.flatMap((key) => {
      const prop = key.replace(/-([a-z])/g, (_match, letter: string) =>
        letter.toUpperCase(),
      );
      return [{ [prop]: 4 }, { [prop]: responsive }];
    }),
  );
};

/** The first token of a list; throws on an empty list (`noUncheckedIndexedAccess`). */
export const first = <T>(items: readonly T[]): T => {
  const [item] = items;
  if (item === undefined) throw new Error("parity: empty token list");
  return item;
};

/** Class output of a render: the root's tokens and those of every descendant that carries a class. */
export interface ClassOutput {
  readonly root: readonly string[];
  readonly parts: readonly (readonly string[])[];
}

const classTokens = (element: Element): string[] =>
  [
    ...new Set(
      (element.getAttribute("class") ?? "")
        .split(/\s+/)
        .filter((token) => token !== ""),
    ),
  ].sort((a, b) => a.localeCompare(b));

/** Render `component` with `props`, read its class output, unmount. */
export const renderClasses = async (
  component: ComponentType<CaseProps>,
  props: CaseProps,
  children?: ReactNode,
): Promise<ClassOutput> => {
  const screen = await render(createElement(component, props, children));
  const root = screen.container.firstElementChild;
  if (root === null)
    throw new Error("parity: the component rendered no element");
  const output: ClassOutput = {
    root: classTokens(root),
    parts: [...root.querySelectorAll("[class]")].map(classTokens),
  };
  await screen.unmount();
  return output;
};

/** A typed component seen through table-driven props: a wrong prop fails the comparison, not the compiler. */
export const loose = (component: unknown): ComponentType<CaseProps> =>
  component as ComponentType<CaseProps>;
