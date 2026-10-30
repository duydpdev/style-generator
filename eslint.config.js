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
import {
  BANNED_TAGS,
  UI_COMPONENT_NAMES,
} from "./packages/ui-react/registry.mjs";

// App code that renders only ui-react components. A tree joins this list
// when it is migrated (phase 06: react-v4, next-v4, the site CTA footer;
// phase 08 adds the rest of site/src).
const UI_APP_FILES = [
  "examples/react-v4/src/**/*.{ts,tsx}",
  "examples/next-v4/app/**/*.{ts,tsx}",
  "site/src/sections/cta-footer.tsx",
  "site/src/app.tsx",
  "site/src/components/topbar*.tsx",
  "site/src/components/scroll-progress.tsx",
  "site/src/components/icon.tsx",
  "site/src/components/sidebar-toc.tsx",
  "site/src/components/chapter-head.tsx",
  "site/src/pages/landing-page.tsx",
];

const TAG_SELECTOR = `JSXOpeningElement[name.name=/^(${BANNED_TAGS.join("|")})$/]`;
const COMPONENT_SELECTOR = `JSXOpeningElement[name.name=/^(${UI_COMPONENT_NAMES.join("|")})$/]`;

// Recipes, cn and the spacing helpers are for component authors; app code
// uses the components' props. Shared with the nuxt-v4 rules (phase 07).
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

  // ui-react's component registry: plain ESM read by this config and the name test.
  {
    files: [
      "packages/ui-react/registry.mjs",
      "packages/ui-react/registry.d.mts",
    ],
    extends: [pluginTs.configs.disableTypeChecked],
  },

  // One file, one job (component, styles, types, test): brainstorm §3.4.
  // The component packages; UI_APP_FILES gets the same limit below.
  {
    files: ["packages/ui-react/**/*.{ts,tsx}", "packages/ui-vue/**/*.ts"],
    rules: {
      "max-lines": [
        "error",
        { max: 150, skipBlankLines: false, skipComments: false },
      ],
    },
  },

  // Compile-time type tests: the assertion is the compiler (`@ts-expect-error` must be consumed,
  // positive lines must compile), and JSX is evaluated only for its type, hence `void (<X />)`.
  {
    files: ["packages/**/*.test-d.{ts,tsx}"],
    rules: {
      "sonarjs/void-use": "off",
      "sonarjs/assertions-in-tests": "off",
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

  // Components-only app code: no layout/text tags, no className, no recipes,
  // short files. Third-party components (NavLink, ReactMarkdown) may still
  // take className.
  {
    files: UI_APP_FILES,
    rules: {
      "max-lines": [
        "error",
        { max: 150, skipBlankLines: false, skipComments: false },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: TAG_SELECTOR,
          message:
            "Render a ui component (Box, Flex, Stack, Grid, Container, Text, Button, …) and keep the element with `as`.",
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
      ],
      "no-restricted-imports": ["error", RESTRICTED_UI_IMPORTS],
    },
  },

  // nuxt-v4 SFCs: vue-eslint-parser hands <script lang="ts"> to the TS parser.
  // Type-aware rules stay off for .vue (the project service cannot open SFCs);
  // vue-tsc (`nuxt typecheck`) type-checks them. Auto-imports (useHead,
  // useState) are declared in .nuxt/ types, so no-undef is off, as
  // typescript-eslint recommends for TS sources.
  {
    files: ["examples/nuxt-v4/app/**/*.vue"],
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
      "vue/no-restricted-html-elements": [
        "error",
        {
          element: BANNED_TAGS,
          message:
            'App code renders @duydpdev/ui-vue components (import them from "~/ui"), not raw layout/text tags.',
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
          message: "No class on ui-vue components: use their props.",
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
          message: "No :class on ui-vue components: use their props.",
        },
      ],
    },
  },
  // nuxt-v4 app code (TS + SFC scripts): no recipes, cn, splitSpacingProps,
  // createVariantMapper. The .ts files are type-aware; their tsconfig
  // references .nuxt/tsconfig.*.json, so run
  // `yarn workspace nuxt-v4-example prepare:nuxt` (after `yarn build:all`)
  // before linting.
  {
    files: ["examples/nuxt-v4/app/**/*.{ts,vue}"],
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
