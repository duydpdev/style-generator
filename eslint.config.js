import pluginJs from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import pluginImportX from "eslint-plugin-import-x";
import pluginJsdoc from "eslint-plugin-jsdoc";
import pluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import pluginSonarjs from "eslint-plugin-sonarjs";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import pluginTs from "typescript-eslint";
import vueParser from "vue-eslint-parser";
import { BANNED_TAGS, UI_COMPONENT_NAMES } from "./examples/ui-registry.mjs";

// App code that renders only the sample components of
// examples/react-v4/src/ui (site/ imports them as react-v4-example/ui).
const UI_APP_FILES = [
  "examples/react-v4/src/**/*.{ts,tsx}",
  "site/src/**/*.tsx",
];

// The sample components themselves render raw tags with className and
// style, and build their classes from the recipes.
const UI_COMPONENT_FILES = ["examples/react-v4/src/ui/**"];

const TAG_SELECTOR = `JSXOpeningElement[name.name=/^(${BANNED_TAGS.join("|")})$/]`;
const COMPONENT_SELECTOR = `JSXOpeningElement[name.name=/^(${UI_COMPONENT_NAMES.join("|")})$/]`;

// no-restricted-syntax entries of every UI_APP_FILES block. A later block
// replaces the rule's options, so the react-v4 block repeats them.
const UI_APP_SYNTAX = [
  {
    selector: TAG_SELECTOR,
    message: `Render a sample component (${UI_COMPONENT_NAMES.join(", ")}) and keep the element with \`as\`.`,
  },
  {
    selector:
      "JSXOpeningElement[name.name=/^[a-z]/] > JSXAttribute[name.name='className']",
    message:
      "No className in app code: use component props, or data-part for bespoke CSS.",
  },
  {
    selector: `${COMPONENT_SELECTOR} > JSXAttribute[name.name='className']`,
    message:
      "No className on ui components: use their props, or data-part for bespoke CSS.",
  },
  {
    selector: "JSXAttribute[name.name='style']",
    message:
      "No style= in app code: use a component prop, a theme token or data-part CSS. A runtime value keeps style= under `// eslint-disable-next-line no-restricted-syntax -- <reason>`.",
  },
];
// react-v4 only: the site's grids use desktop-first CSS templates
// (max-width media queries) that `columns` cannot express.
const GRID_COLUMNS_SYNTAX = {
  selector:
    "JSXOpeningElement[name.name='Grid']:not(:has(JSXAttribute[name.name='columns']))",
  message:
    "Grid needs `columns`: use Stack for one vertical column and Flex for a row.",
};

// Recipes, cn and the spacing helpers are for component authors; app code
// uses the components' props. Shared by the react-v4 and nuxt-v4 example rules.
const RESTRICTED_UI_IMPORTS = {
  patterns: [
    {
      group: [
        "design-system-example",
        "design-system-example/*",
        "@duydpdev/style-generator",
        "@duydpdev/style-generator/*",
      ],
      importNamePattern:
        "Recipe$|^cn$|^createCn$|^splitSpacingProps$|^createVariantMapper$",
      message:
        "App code renders ui components and passes props; recipes, cn, splitSpacingProps and createVariantMapper are for component authors.",
    },
  ],
};

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

  // The sample-component registry: plain ESM read by this config.
  {
    files: ["examples/ui-registry.mjs", "examples/ui-registry.d.mts"],
    extends: [pluginTs.configs.disableTypeChecked],
  },

  // Compile-time type tests: the assertion is the compiler (`@ts-expect-error` must be consumed,
  // positive lines must compile), and JSX is evaluated only for its type, hence `void (<X />)`.
  {
    files: [
      "examples/react-v4/tests/**/*.tsx",
    ],
    rules: {
      "sonarjs/void-use": "off",
      "sonarjs/assertions-in-tests": "off",
    },
  },

  // Landing site components and the example apps: typed like src/, without
  // mandatory JSDoc.
  {
    files: [
      "site/src/**/*.{ts,tsx}",
      "examples/**/*.{ts,tsx}",
    ],
    rules: Object.fromEntries(
      Object.keys(pluginJsdoc.rules ?? {})
        .filter((name) => name.startsWith("require-"))
        .map((name) => [`jsdoc/${name}`, "off"]),
    ),
  },

  // Components-only app code: no layout/text tags, no className, no recipes,
  // short files. Third-party components (NavLink, ReactMarkdown) may still
  // take className.
  {
    files: UI_APP_FILES,
    ignores: UI_COMPONENT_FILES,
    rules: {
      "max-lines": [
        "error",
        { max: 150, skipBlankLines: false, skipComments: false },
      ],
      "no-restricted-syntax": ["error", ...UI_APP_SYNTAX],
      "no-restricted-imports": ["error", RESTRICTED_UI_IMPORTS],
    },
  },

  {
    files: ["examples/react-v4/src/**/*.{ts,tsx}"],
    ignores: UI_COMPONENT_FILES,
    rules: {
      "no-restricted-syntax": ["error", ...UI_APP_SYNTAX, GRID_COLUMNS_SYNTAX],
    },
  },

  // nuxt-v4 SFCs: vue-eslint-parser hands <script lang="ts"> to the TS parser.
  // Type-aware rules stay off for .vue (the project service cannot open SFCs);
  // vue-tsc (`nuxt typecheck`) type-checks them, tests/nuxt/** included.
  // Auto-imports (useHead, useState) are declared in .nuxt/ types, so
  // no-undef is off, as typescript-eslint recommends for TS sources.
  {
    files: ["examples/nuxt-v4/app/**/*.vue", "examples/nuxt-v4/tests/**/*.vue"],
    extends: [pluginTs.configs.disableTypeChecked],
    plugins: { vue: pluginVue },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: [".vue"],
        sourceType: "module",
      },
    },
    rules: {
      "no-undef": "off",
      // Spacing props reach the components as attributes, which keep the
      // template's spelling: `:gap-x` would match no prop, `:gapX` does.
      "vue/attribute-hyphenation": ["error", "never"],
    },
  },
  // nuxt-v4 app templates render the app/ui components named in
  // examples/ui-registry.mjs: no layout/text tags, no class or style, no
  // Grid without columns. app/ui itself renders the tags.
  {
    files: ["examples/nuxt-v4/app/**/*.vue"],
    ignores: ["examples/nuxt-v4/app/ui/**"],
    rules: {
      "vue/no-restricted-html-elements": [
        "error",
        {
          element: BANNED_TAGS,
          message:
            'App code renders the app/ui components (import Box from "~/ui/Box.vue"), not raw layout/text tags.',
        },
      ],
      "vue/no-restricted-static-attribute": [
        "error",
        {
          key: "class",
          element: "/^[a-z]/",
          message: "No class in app code: use component props.",
        },
        {
          key: "class",
          element: `/^(${UI_COMPONENT_NAMES.join("|")})$/`,
          message: "No class on ui components: use their props.",
        },
        {
          key: "style",
          message: "No style in app code: use component props or theme tokens.",
        },
      ],
      "vue/no-restricted-v-bind": [
        "error",
        "/^v-/",
        {
          argument: "class",
          element: "/^[a-z]/",
          message: "No :class in app code: use component props.",
        },
        {
          argument: "class",
          element: `/^(${UI_COMPONENT_NAMES.join("|")})$/`,
          message: "No :class on ui components: use their props.",
        },
        {
          argument: "style",
          message: "No :style in app code: use component props or theme tokens.",
        },
      ],
      "vue/no-restricted-syntax": [
        "error",
        {
          selector:
            "VElement[rawName='Grid'] > VStartTag:not(:has(VAttribute[key.name='columns'])):not(:has(VAttribute[key.argument.name='columns']))",
          message: "Grid needs columns; use Stack for a single column.",
        },
      ],
    },
  },
  // nuxt-v4 app code (TS + SFC scripts): no recipes, cn, splitSpacingProps,
  // createVariantMapper; app/ui is where they belong. The .ts files are
  // type-aware; their tsconfig references .nuxt/tsconfig.*.json, so run
  // `yarn workspace nuxt-v4-example prepare:nuxt` (after `yarn build:all`)
  // before linting.
  {
    files: ["examples/nuxt-v4/app/**/*.{ts,vue}"],
    ignores: ["examples/nuxt-v4/app/ui/**"],
    rules: {
      "no-restricted-imports": ["error", RESTRICTED_UI_IMPORTS],
    },
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
