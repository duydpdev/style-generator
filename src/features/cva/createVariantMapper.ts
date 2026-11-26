import type { KebabCase } from "../../core/inference";
import type { ColorState } from "../../shared/colorStates";
import { toKebabCase } from "../../shared/helpers";
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

// The chained ` variant:class` suffixes of `K`: one per state whose sibling `K<suffix>` is in `T`.
type JoinStates<
  K extends string,
  P extends string,
  S extends readonly ColorState[],
  T extends string,
> = S extends readonly [
  infer H extends ColorState,
  ...infer R extends readonly ColorState[],
]
  ? `${`${K}${H["suffix"]}` extends T ? ` ${H["variant"]}:${MappedVariant<`${K}${H["suffix"]}`, P>}` : ""}${JoinStates<K, P, R, T>}`
  : "";

// `{ states }` result: a non-tuple `states`, a wide row or a non-literal token falls back to `string`.
type StateVariantMap<
  T extends string,
  P extends string,
  S extends readonly ColorState[],
> = {
  readonly [K in T]: number extends S["length"]
    ? string
    : string extends S[number]["suffix"] | S[number]["variant"]
      ? string
      : string extends K
        ? string
        : `${MappedVariant<K, P>}${JoinStates<K, P, S, T>}`;
};

// `{ opacities }` result: each token × step adds `token/step` → `class/step`, never crossed with states.
type OpacityVariantMap<
  T extends string,
  P extends string,
  S extends readonly ColorState[],
  N extends number,
> = {
  readonly [K in T | `${T}/${N}`]: K extends T
    ? StateVariantMap<T, P, S>[K]
    : K extends `${infer B extends T}/${infer Step}`
      ? `${MappedVariant<B, P>}/${Step}`
      : never;
};

// Runtime shape of the optional third argument (the overloads narrow it).
interface VariantMapperRuntimeOptions {
  readonly states?: readonly ColorState[];
  readonly opacities?: readonly number[];
  readonly allowUnregisteredPrefix?: true;
}

/**
 * Maps tokens to prefixed classes kebab-cased like the registry's, so each class has an `@source inline` line.
 * `{ states }` chains `variant:class` for sibling tokens (`primaryHover`); `{ opacities }` adds `token/step` keys.
 * @param {string} prefix - A registry prefix (`bg`, `rounded-t`, …), an array of them, or `""` for bare tokens; others need `{ allowUnregisteredPrefix: true }`
 * @param {readonly string[]} tokens - Token keys (e.g. `["primary", "secondary"]`)
 * @returns {Record<string, string>} Token → class map (one map per prefix for an array)
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
  const S extends readonly ColorState[] = readonly [],
>(
  prefix: P,
  tokens: readonly T[],
  opts: { readonly opacities: readonly N[]; readonly states?: S },
): OpacityVariantMap<T, P, S, N>;
export function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
  const N extends number,
  const S extends readonly ColorState[] = readonly [],
>(
  prefixes: readonly P[],
  tokens: readonly T[],
  opts: { readonly opacities: readonly N[]; readonly states?: S },
): { readonly [Px in P]: OpacityVariantMap<T, Px, S, N> };
export function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
  const S extends readonly ColorState[],
>(
  prefix: P,
  tokens: readonly T[],
  opts: { readonly states: S },
): StateVariantMap<T, P, S>;
export function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
  const S extends readonly ColorState[],
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
      for (const { suffix, variant } of states ?? []) {
        const siblingKey = `${token}${suffix}`;
        if (tokenSet.has(siblingKey)) {
          cls += ` ${variant}:${mapClass(prefix, siblingKey)}`;
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
