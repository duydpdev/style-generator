import type { CamelCase, KebabCase } from "../../core/inference";
import { toKebabCase, toPascalCase } from "../../shared";
import type { RegistryPrefix } from "../registry/builtInCategories";

type MappedVariant<T extends string, P extends string> = P extends ""
  ? KebabCase<T>
  : `${P}-${KebabCase<T>}`;

type VariantMap<T extends string, P extends string> = {
  [K in T]: MappedVariant<K, P>;
};

type MultiVariantMap<T extends string, P extends string> = {
  [Px in P]: VariantMap<T, Px>;
};

/**
 * The chained ` state:class` suffixes of token `K`: one per state in `S`
 * whose sibling token (`K` + Pascal-cased state — the runtime's
 * `toPascalCase`, so `focus-visible` -> `focusVisible`) is declared in `T`.
 */
type JoinStates<
  K extends string,
  P extends string,
  S extends readonly string[],
  T extends string,
> = S extends readonly [
  infer H extends string,
  ...infer R extends readonly string[],
]
  ? `${`${K}${Capitalize<CamelCase<H>>}` extends T ? ` ${KebabCase<H>}:${MappedVariant<`${K}${Capitalize<CamelCase<H>>}`, P>}` : ""}${JoinStates<K, P, R, T>}`
  : "";

/**
 * Result of the `{ states }` overloads: each token maps to its own literal
 * class, followed by one `state:class` per sibling state. A non-tuple
 * `states` (`readonly string[]`) or a non-literal token type cannot be
 * resolved statically and falls back to `string`.
 */
type StateVariantMap<
  T extends string,
  P extends string,
  S extends readonly string[],
> = {
  readonly [K in T]: number extends S["length"]
    ? string
    : string extends K
      ? string
      : `${MappedVariant<K, P>}${JoinStates<K, P, S, T>}`;
};

/**
 * Result of the `{ opacities }` overloads: every token keeps its
 * `StateVariantMap` class, and each token × step adds a `token/step` key
 * mapped to `class/step`. State classes are never crossed with a step.
 */
type OpacityVariantMap<
  T extends string,
  P extends string,
  S extends readonly string[],
  N extends number,
> = {
  readonly [K in T | `${T}/${N}`]: K extends T
    ? StateVariantMap<T, P, S>[K]
    : K extends `${infer B extends T}/${infer Step}`
      ? `${MappedVariant<B, P>}/${Step}`
      : never;
};

/** Runtime shape of the optional third argument (the overloads narrow it). */
interface VariantMapperRuntimeOptions {
  readonly states?: readonly string[];
  readonly opacities?: readonly number[];
  readonly allowUnregisteredPrefix?: true;
}

/**
 * Creates a mapping of tokens to their corresponding prefixed CSS classes.
 * Classes are always kebab-cased with the SAME `toKebabCase` used by the
 * registry (`flattenByCategory`/`generateSourceInline`), so a mapper's
 * output is guaranteed to match a class the registry emits `@source
 * inline(...)` for.
 *
 * The optional `{ states }` argument (e.g. `COLOR_STATES`) lists state names
 * to look up as sibling RAW tokens. For a raw token `t`, a state `s` is
 * appended to `t`'s class only when `tokens` also contains `t` + Pascal-cased
 * `s` (`primary` + `"hover"` -> `primaryHover`). A token with no matching
 * sibling keeps its plain single class; sibling tokens themselves are plain
 * single classes. The result is a literal chained string when `states` is a
 * literal tuple (`as const`, `COLOR_STATES`) and `string` when it is typed
 * `readonly string[]`. `{ allowUnregisteredPrefix: true }` accepts any
 * prefix string instead of only registry prefixes.
 *
 * `{ opacities }` (e.g. `tokens.opacities`) adds a `token/step` key per token
 * and step mapped to `class/step` (`primary/10` -> `bg-primary/10`); combined
 * with `{ states }`, the state classes stay on the base key only
 * (`primary/10` never carries `hover:`). Not combinable with
 * `allowUnregisteredPrefix`.
 * @template {string} T
 * @template {RegistryPrefix | ""} P
 * @param {P} prefix - A utility prefix the registry emits `@source inline` for (`bg`, `text`, `border`, `ring`, `rounded-t`, …); `""` yields the bare kebab-case token (typography). An unregistered prefix (`fill`) is a type error — it would map to classes no `@source inline` line covers; pass `{ allowUnregisteredPrefix: true }` to opt out.
 * @param {readonly T[]} tokens - An array of token keys (e.g. ['primary', 'secondary'])
 * @returns {VariantMap<T, P>} An object mapping each token to its full class name
 * @example
 * const colors = ["primary", "secondary"] as const;
 * const bgVariants = createVariantMapper("bg", colors);
 * // Result: { primary: "bg-primary", secondary: "bg-secondary" }
 * @example
 * // Multiple prefixes at once
 * const border = createVariantMapper(["border-x", "border-y"] as const, ["sm", "md"] as const);
 * // Result: { "border-x": { sm: "border-x-sm", md: "border-x-md" }, "border-y": { sm: "border-y-sm", md: "border-y-md" } }
 * @example
 * // Flat sibling state tokens collapse into one chained class string per
 * // base token — feed straight into cva's variants. `COLOR_STATES` is the
 * // same list the registry's `@source inline` state lines are built from.
 * const tokens = ["primary", "primaryHover", "primaryActive", "danger"] as const;
 * const bg = createVariantMapper("bg", tokens, { states: COLOR_STATES });
 * // Result: {
 * //   primary: "bg-primary hover:bg-primary-hover active:bg-primary-active",
 * //   primaryHover: "bg-primary-hover",
 * //   primaryActive: "bg-primary-active",
 * //   danger: "bg-danger",
 * // }
 * @example
 * // Opacity steps (`tokens.opacities`): one `token/step` key per token and step
 * const bg = createVariantMapper("bg", ["primary"] as const, { opacities: [10] });
 * // Result: { primary: "bg-primary", "primary/10": "bg-primary/10" }
 */
export function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
>(prefix: P, tokens: readonly T[]): VariantMap<T, P>;
export function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
>(prefixes: readonly P[], tokens: readonly T[]): MultiVariantMap<T, P>;
export function createVariantMapper<
  const T extends string,
  const P extends string,
>(
  prefix: P,
  tokens: readonly T[],
  opts: { readonly allowUnregisteredPrefix: true },
): VariantMap<T, P>;
export function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
  const N extends number,
  const S extends readonly string[] = readonly [],
>(
  prefix: P,
  tokens: readonly T[],
  opts: { readonly opacities: readonly N[]; readonly states?: S },
): OpacityVariantMap<T, P, S, N>;
export function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
  const N extends number,
  const S extends readonly string[] = readonly [],
>(
  prefixes: readonly P[],
  tokens: readonly T[],
  opts: { readonly opacities: readonly N[]; readonly states?: S },
): { readonly [Px in P]: OpacityVariantMap<T, Px, S, N> };
export function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
  const S extends readonly string[],
>(
  prefix: P,
  tokens: readonly T[],
  opts: { readonly states: S },
): StateVariantMap<T, P, S>;
export function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
  const S extends readonly string[],
>(
  prefixes: readonly P[],
  tokens: readonly T[],
  opts: { readonly states: S },
): { readonly [Px in P]: StateVariantMap<T, Px, S> };
export function createVariantMapper<
  const T extends string,
  const P extends string,
>(
  prefixOrPrefixes: P | readonly P[],
  tokens: readonly T[],
  opts?: VariantMapperRuntimeOptions,
): Record<string, string> | Record<string, Record<string, string>> {
  const mapClass = (prefix: P, token: string): string => {
    const kebab = toKebabCase(token);
    return prefix === "" ? kebab : `${prefix}-${kebab}`;
  };

  const states = opts?.states;
  const opacities = opts?.opacities ?? [];
  const tokenSet = new Set<string>(tokens);

  const buildForPrefix = (prefix: P): Record<string, string> => {
    const map: Record<string, string> = {};
    for (const token of tokens) {
      const base = mapClass(prefix, token);
      let cls = base;
      for (const state of states ?? []) {
        const siblingKey = `${token}${toPascalCase(state)}`;
        if (tokenSet.has(siblingKey)) {
          cls += ` ${toKebabCase(state)}:${mapClass(prefix, siblingKey)}`;
        }
      }
      map[token] = cls;
      for (const step of opacities) {
        map[`${token}/${String(step)}`] = `${base}/${String(step)}`;
      }
    }
    return map;
  };

  if (typeof prefixOrPrefixes === "string") {
    return buildForPrefix(prefixOrPrefixes);
  }
  return Object.fromEntries(
    prefixOrPrefixes.map((prefix) => [prefix, buildForPrefix(prefix)]),
  );
}
