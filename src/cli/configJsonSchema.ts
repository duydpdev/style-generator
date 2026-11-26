import { z } from "zod";

import {
  builtInCategories,
  isCssVarCategory,
} from "../features/registry/builtInCategories";
import { StyleGenConfigFileSchema } from "../node/loadStyleGenConfig";

/** The config's JSON Schema `init` writes in the project root. */
export const CONFIG_SCHEMA_FILE = "style-gen.config.schema.json";

type JsonObject = Record<string, unknown>;

// Cross-field rules JSON Schema cannot state, named so an editor user knows it is not the last word.
const CROSS_FIELD_NOTE =
  "Not checked by this JSON Schema: `generate`, `style-gen doctor` and the bundler plugins also require";

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// `value[key]` as an object; the shape is fixed, so a miss is a bug here, not an input error.
function child(value: unknown, key: string): JsonObject {
  const node = isJsonObject(value) ? value[key] : undefined;
  if (!isJsonObject(node)) {
    throw new Error(`Config JSON Schema has no object at "${key}"`);
  }
  return node;
}

// One `coverage` entry per registry category, accepting what the options schema accepts for it
// (own `prefixes`, `opacities`, `keys: "aliased"`); rewrites the node in place.
// Rationale: documents/architecture.md#configjsonschemats-why-the-narrowing-is-stricter-and-can-fall-back
function refineCoverage(coverage: JsonObject): void {
  const anyOf: unknown = child(coverage, "additionalProperties").anyOf;
  if (!Array.isArray(anyOf) || anyOf.length !== 2) {
    throw new Error("Config JSON Schema has an unexpected coverage shape");
  }
  const boolRule: unknown = anyOf[0];
  const optionsRule: unknown = anyOf[1];

  const properties: JsonObject = {};
  for (const descriptor of builtInCategories) {
    const rule = structuredClone(optionsRule);
    if (!isJsonObject(rule)) throw new Error("Coverage rule is not an object");
    const ruleProperties = child(rule, "properties");

    if ("bareClassName" in descriptor || "literalScale" in descriptor) {
      delete ruleProperties.prefixes;
    } else {
      child(ruleProperties, "prefixes").items = {
        type: "string",
        enum: [...descriptor.classPrefixes],
      };
    }
    if ("opacityModifier" in descriptor) {
      const opacities = child(ruleProperties, "opacities");
      opacities.uniqueItems = true;
      const entry: unknown = child(opacities, "items").anyOf;
      const group: unknown = Array.isArray(entry) ? entry[1] : undefined;
      child(child(group, "properties"), "steps").uniqueItems = true;
      child(child(group, "properties"), "prefixes").items = {
        type: "string",
        enum: [...descriptor.classPrefixes],
      };
    } else {
      delete ruleProperties.opacities;
    }
    if (!isCssVarCategory(descriptor) || "literalScale" in descriptor) {
      child(ruleProperties, "keys").enum = ["all"];
    }
    properties[descriptor.key] = { anyOf: [structuredClone(boolRule), rule] };
  }

  delete coverage.propertyNames;
  coverage.properties = properties;
  coverage.additionalProperties = false;
}

/**
 * The JSON Schema of `style-gen.config.json`, narrowed with every value rule
 * JSON Schema can state; on an unexpected Zod output shape the plain schema is returned.
 * @param {Record<string, unknown>} [plain] - The unrefined JSON Schema; defaults to `z.toJSONSchema` of the config file schema (a parameter so a test can feed another shape)
 * @returns {Record<string, unknown>} The JSON Schema document
 */
export function buildConfigJsonSchema(
  plain: Record<string, unknown> = z.toJSONSchema(StyleGenConfigFileSchema),
): Record<string, unknown> {
  try {
    const schema: JsonObject = structuredClone(plain);
    const properties = child(schema, "properties");

    refineCoverage(child(properties, "coverage"));
    child(properties, "breakpoints").description =
      `${CROSS_FIELD_NOTE} each entry to name a screen: a key of \`screens\` or one of the default screens.`;
    child(properties, "screens").description =
      `${CROSS_FIELD_NOTE} every screen, merged with the default screens, to use one unit.`;
    return schema;
  } catch {
    return plain;
  }
}

/**
 * The config's `$schema` pointer, which goes first; a user-written one stays where it is.
 * @param {Record<string, unknown>} content The existing config content.
 * @returns {{ $schema?: string }} The key to put first, or nothing.
 */
export function configSchemaRef(content: Record<string, unknown>): {
  $schema?: string;
} {
  return content.$schema === undefined
    ? { $schema: `./${CONFIG_SCHEMA_FILE}` }
    : {};
}
