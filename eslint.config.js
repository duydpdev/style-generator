import pluginJs from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import pluginImportX from "eslint-plugin-import-x";
import pluginJsdoc from "eslint-plugin-jsdoc";
import pluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import pluginSonarjs from "eslint-plugin-sonarjs";
import globals from "globals";
import pluginTs from "typescript-eslint";

export default pluginTs.config(
  pluginJs.configs.recommended,
  pluginPrettierRecommended,
  pluginJsdoc.configs["flat/recommended"],
  pluginImportX.flatConfigs.recommended,
  pluginImportX.flatConfigs.typescript,

  {
    files: ["./src/**/*.{js,mjs,cjs,ts}"],
  },

  {
    extends: [
      ...pluginTs.configs.strictTypeChecked,
      ...pluginTs.configs.stylisticTypeChecked,
    ],

    languageOptions: {
      globals: globals.browser,
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    plugins: {
      sonarjs: pluginSonarjs,
      jsdoc: pluginJsdoc,
    },

    rules: {
      ...pluginSonarjs.configs.recommended.rules,
      "import-x/no-unresolved": "off",
      "import-x/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          pathGroups: [
            {
              pattern: "@/**",
              group: "internal",
              position: "after",
            },
          ],
          "newlines-between": "always",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },

  // Node scripts (publish gates, smoke run, site example build): plain JS
  // with Node globals. Type-aware rules are off because JSON.parse & co. are
  // `any` in JS. `yarn typecheck:scripts` (tsconfig.scripts.json, checkJs)
  // catches wrong API calls and JSDoc mismatches, but not `strict` (no null
  // checks, implicit `any` allowed); the gate tests in src/__integration__
  // cover their behaviour.
  {
    files: ["scripts/**/*.mjs", "site/scripts/**/*.mjs"],
    extends: [pluginTs.configs.disableTypeChecked],
    languageOptions: {
      globals: globals.node,
    },
  },

  // ui-react's component registry: plain ESM read by this config and the name test.
  {
    files: [
      "packages/ui-react/registry.mjs",
      "packages/ui-react/registry.d.mts",
    ],
    extends: [pluginTs.configs.disableTypeChecked],
  },

  // One file, one job (component, styles, types, test): brainstorm §3.4.
  // Phase 06 adds UI_APP_FILES and phase 07 packages/ui-vue/** to this rule.
  {
    files: ["packages/ui-react/**/*.{ts,tsx}"],
    rules: {
      "max-lines": [
        "error",
        { max: 150, skipBlankLines: false, skipComments: false },
      ],
    },
  },

  // Landing site components, the example apps and the workspace packages: typed like src/, without
  // mandatory JSDoc.
  {
    files: [
      "site/src/**/*.{ts,tsx}",
      "examples/**/*.{ts,tsx}",
      "packages/**/*.{ts,tsx}",
    ],
    rules: Object.fromEntries(
      Object.keys(pluginJsdoc.rules ?? {})
        .filter((name) => name.startsWith("require-"))
        .map((name) => [`jsdoc/${name}`, "off"]),
    ),
  },

  // The design-system DX tests run in Node (TypeScript Compiler API, fs).
  {
    files: ["examples/design-system/tests/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    ignores: [
      "node_modules/*",
      "**/node_modules/*",
      "**/*.config.*",
      "**/dist/*",
      "*.cjs",
      ".yarn/*",
      "coverage/*",
      // nuxt-v4 references ./.nuxt/tsconfig.*.json, which only exist after
      // `nuxt prepare` (no postinstall hook in the examples); generated output.
      "examples/nuxt-v4/**",
      "examples/**/.next/**",
      "examples/**/.nuxt/**",
      "examples/**/.output/**",
      "**/next-env.d.ts",
      "site/dist/**",
      "site/public/**",
      // Compiled by `yarn typecheck:dist` (tsconfig.dts-check*.json) against
      // the built package, so the project service cannot map them.
      "scripts/dist-types.assert.ts",
      "scripts/dist-types.cjs.assert.cts",
    ],
  },
);
