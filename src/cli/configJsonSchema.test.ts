import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";
import { z } from "zod";

import { builtInCategories } from "../features/registry/builtInCategories";
import { StyleGenConfigFileSchema } from "../node/loadStyleGenConfig";

import { buildConfigJsonSchema } from "./configJsonSchema";

type Json = Record<string, unknown>;

const isJson = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type Check = (schema: Json, value: unknown, at: string) => string[];

const checkType: Check = (schema, value, at) => {
  const matches: Record<string, boolean> = {
    string: typeof value === "string",
    boolean: typeof value === "boolean",
    integer: Number.isInteger(value),
    array: Array.isArray(value),
    object: isJson(value),
  };
  const type = schema.type;
  return typeof type === "string" && matches[type] === false
    ? [`${at}: not ${type}`]
    : [];
};

const checkScalar: Check = (schema, value, at) => {
  const errors: string[] = [];
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push(`${at}: not in enum`);
  }
  if (typeof value === "string" && typeof schema.pattern === "string") {
    if (!new RegExp(schema.pattern).test(value)) errors.push(`${at}: pattern`);
  }
  if (typeof value === "number") {
    const { minimum, maximum } = schema;
    if (typeof minimum === "number" && value < minimum)
      errors.push(`${at}: min`);
    if (typeof maximum === "number" && value > maximum)
      errors.push(`${at}: max`);
  }
  return errors;
};

const checkArray: Check = (schema, value, at) => {
  if (!Array.isArray(value)) return [];
  const errors: string[] = [];
  const { minItems } = schema;
  if (typeof minItems === "number" && value.length < minItems) {
    errors.push(`${at}: too few items`);
  }
  if (schema.uniqueItems === true && new Set(value).size !== value.length) {
    errors.push(`${at}: items not unique`);
  }
  value.forEach((item, i) => {
    errors.push(...validate(schema.items, item, `${at}[${String(i)}]`));
  });
  return errors;
};

const checkObject: Check = (schema, value, at) => {
  if (!isJson(value)) return [];
  const errors: string[] = [];
  const properties = isJson(schema.properties) ? schema.properties : {};
  for (const key of Array.isArray(schema.required) ? schema.required : []) {
    if (typeof key === "string" && !Object.hasOwn(value, key)) {
      errors.push(`${at}: missing "${key}"`);
    }
  }
  const extra = schema.additionalProperties;
  for (const [key, item] of Object.entries(value)) {
    errors.push(...validate(schema.propertyNames, key, `${at}<${key}>`));
    if (Object.hasOwn(properties, key)) {
      errors.push(...validate(properties[key], item, `${at}.${key}`));
    } else if (extra === false) {
      errors.push(`${at}: unknown key "${key}"`);
    } else {
      errors.push(...validate(extra, item, `${at}.${key}`));
    }
  }
  return errors;
};

const checkAnyOf: Check = (schema, value, at) => {
  const branches: unknown = schema.anyOf;
  return Array.isArray(branches) &&
    branches.every((branch) => validate(branch, value, at).length > 0)
    ? [`${at}: matches no anyOf branch`]
    : [];
};

/**
 * Minimal JSON Schema evaluator for the keywords `z.toJSONSchema` emits for
 * the config schema (no `$ref`s, no formats). Returns the violations; empty
 * means valid.
 * @param {unknown} schema - Schema node
 * @param {unknown} value - Instance
 * @param {string} at - Instance path, for messages
 * @returns {string[]} One message per violation
 */
function validate(schema: unknown, value: unknown, at = "$"): string[] {
  if (!isJson(schema)) return [];
  const typeErrors = checkType(schema, value, at);
  if (typeErrors.length > 0) return typeErrors;
  return [checkScalar, checkArray, checkObject, checkAnyOf].flatMap((check) =>
    check(schema, value, at),
  );
}

const schema = buildConfigJsonSchema();

const accepted = (config: unknown): boolean =>
  validate(schema, config).length === 0;

describe("buildConfigJsonSchema", () => {
  // C-L1: each of these is rejected by the CLI (StyleGenConfigFileSchema) and
  // must be rejected by the JSON Schema an editor reads too.
  it.each<[string, unknown]>([
    ["duplicate opacities", { coverage: { colors: { opacities: [10, 10] } } }],
    [
      "opacities on a category without an opacity modifier",
      { coverage: { typography: { opacities: [10] } } },
    ],
    ["opacities on shadows", { coverage: { shadows: { opacities: [10] } } }],
    ["an unknown prefix", { coverage: { colors: { prefixes: ["bgg"] } } }],
    [
      "a color prefix on borderRadius",
      { coverage: { borderRadius: { prefixes: ["bg"] } } },
    ],
    [
      "prefixes on typography",
      { coverage: { typography: { prefixes: ["text"] } } },
    ],
    [
      "keys: aliased on a category without aliases",
      { coverage: { typography: { keys: "aliased" } } },
    ],
    [
      "an opacity step above 100",
      { coverage: { colors: { opacities: [101] } } },
    ],
    ["an opacity step of 0", { coverage: { colors: { opacities: [0] } } }],
    [
      "an opacity group with a prefix that is not a colors prefix",
      {
        coverage: {
          colors: { opacities: [{ steps: [32], prefixes: ["shadow"] }] },
        },
      },
    ],
    [
      "an opacity group without steps",
      { coverage: { colors: { opacities: [{ prefixes: ["bg"] }] } } },
    ],
    [
      "an opacity group with duplicate steps",
      { coverage: { colors: { opacities: [{ steps: [32, 32] }] } } },
    ],
    [
      "an opacity group with an unknown key",
      { coverage: { colors: { opacities: [{ steps: [32], extra: 1 }] } } },
    ],
    [
      "an opacity group on a category without an opacity modifier",
      { coverage: { shadows: { opacities: [{ steps: [32] }] } } },
    ],
    [
      "prefixes on a scale category",
      { coverage: { zIndex: { prefixes: ["z"] } } },
    ],
    [
      "keys: aliased on a scale category",
      { coverage: { motionDuration: { keys: "aliased" } } },
    ],
    [
      "opacities on the opacity scale",
      { coverage: { opacity: { opacities: [10] } } },
    ],
    ["an unknown category", { coverage: { sizes: true } }],
  ])("rejects %s, as the CLI does", (_title, config) => {
    expect(StyleGenConfigFileSchema.safeParse(config).success).toBe(false);
    expect(accepted(config)).toBe(false);
  });

  it.each<[string, unknown]>([
    ["no config", {}],
    ["a boolean category", { coverage: { colors: false, typography: true } }],
    [
      "colors with opacities",
      { coverage: { colors: { opacities: [10, 50], keys: "aliased" } } },
    ],
    [
      "colors with opacity groups next to plain steps",
      {
        coverage: {
          colors: {
            prefixes: ["bg", "text"],
            opacities: [
              5,
              { steps: [32], prefixes: ["bg"], keys: ["foreground"] },
              { steps: [10, 20] },
            ],
          },
        },
      },
    ],
    [
      "a real prefix of every category",
      Object.fromEntries([
        [
          "coverage",
          Object.fromEntries(
            builtInCategories
              .filter((d) => !("bareClassName" in d || "literalScale" in d))
              .map((d) => [d.key, { prefixes: [d.classPrefixes[0]] }]),
          ),
        ],
      ]),
    ],
    ["typography keys: all", { coverage: { typography: { keys: "all" } } }],
    [
      "a scale category on, off or with keys: all",
      {
        coverage: {
          zIndex: false,
          opacity: true,
          motionEasing: { keys: "all" },
        },
      },
    ],
    [
      "the $schema pointer and the path keys",
      {
        $schema: "./style-gen.config.schema.json",
        theme: "a.json",
        output: "a.css",
        tokensOutput: "a.tokens.ts",
      },
    ],
  ])("accepts %s, as the CLI does", (_title, config) => {
    expect(StyleGenConfigFileSchema.safeParse(config).success).toBe(true);
    expect(accepted(config)).toBe(true);
  });

  it("accepts the committed example configs", () => {
    for (const file of [
      "examples/design-system/style-gen.config.json",
      "site/style-gen.config.json",
    ]) {
      const config: unknown = JSON.parse(
        readFileSync(join(__dirname, "..", "..", file), "utf8"),
      );
      expect(validate(schema, config), file).toEqual([]);
    }
  });

  it("enumerates every category's real class prefixes", () => {
    for (const descriptor of builtInCategories) {
      if ("bareClassName" in descriptor || "literalScale" in descriptor) {
        continue;
      }
      for (const prefix of descriptor.classPrefixes) {
        expect(
          accepted({ coverage: { [descriptor.key]: { prefixes: [prefix] } } }),
          `${descriptor.key}: ${prefix}`,
        ).toBe(true);
      }
    }
  });

  it("says in descriptions that cross-field checks are not expressible", () => {
    const properties = schema.properties;
    expect(isJson(properties)).toBe(true);
    for (const key of ["breakpoints", "screens"]) {
      const node = isJson(properties) ? properties[key] : undefined;
      expect(node, key).toMatchObject({
        description: expect.stringMatching(/generate|doctor/) as unknown,
      });
    }
  });

  it("only adds constraints to the plain Zod output", () => {
    const plain = z.toJSONSchema(StyleGenConfigFileSchema);
    expect(Object.keys(schema)).toEqual(Object.keys(plain));
    expect(schema.additionalProperties).toBe(false);
  });

  // A consumer may run another zod 4.x whose JSON output has a different
  // shape; the narrowing then gives way to the plain schema instead of
  // making `schema` and `init` fail.
  describe("when zod's JSON output has another shape", () => {
    it.each<[string, Record<string, unknown>]>([
      [
        "coverage is no anyOf pair",
        {
          type: "object",
          properties: {
            coverage: { type: "object", additionalProperties: { oneOf: [] } },
          },
          additionalProperties: false,
        },
      ],
      ["there are no properties", { type: "object" }],
      [
        "a coverage rule has no prefixes node",
        {
          type: "object",
          properties: {
            coverage: {
              type: "object",
              additionalProperties: {
                anyOf: [
                  { type: "boolean" },
                  { type: "object", properties: {} },
                ],
              },
            },
          },
        },
      ],
    ])("returns the input untouched when %s", (_title, shape) => {
      const before = structuredClone(shape);

      const result = buildConfigJsonSchema(shape);

      expect(result).toBe(shape);
      expect(result).toEqual(before);
      expect(result.type).toBe("object");
    });
  });
});
