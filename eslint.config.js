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
// style, and build their classes from the recipes. Their stories
// (src/ui/<Name>.stories.tsx, the app's only stories) share the exemption:
// they render props and play checks, one file per component's variants.
const UI_COMPONENT_FILES = ["examples/react-v4/src/ui/**"];

const TAG_SELECTOR = `JSXOpeningElement[name.name=/^(${BANNED_TAGS.join("|")})$/]`;
const COMPONENT_SELECTOR = `JSXOpeningElement[name.name=/^(${UI_COMPONENT_NAMES.join("|")})$/]`;

// Tag ban shared by every UI_APP_FILES block (uiAppSyntax puts it first).
const UI_TAG_SYNTAX = {
  selector: TAG_SELECTOR,
  message: `Render a sample component (${UI_COMPONENT_NAMES.join(", ")}) and keep the element with \`as\`.`,
};

// Bespoke CSS hooks are namespaced classes, not Tailwind utilities and not
// data-part: `s-` for site/, `x-` for the examples (`sg-` is the CSS variable
// prefix and stays out). The className rules therefore accept only `<ns>-`
// tokens (a literal, or the pieces of a template/conditional); a computed
// className must come from a table of `<ns>-` classes and says so with a
// disable comment. Third-party components (NavLink, ReactMarkdown) stay
// outside both selectors. A later block's no-restricted-syntax replaces the
// rule's options, so the react-v4 block repeats the whole list with `x`.
const uiAppSyntax = (ns) => {
  const lowerTag = "JSXOpeningElement[name.name=/^[a-z]/]";
  const classNameAttr = "JSXAttribute[name.name='className']";
  const classMessage = `className in app code takes only \`${ns}-\` classes (bespoke CSS hooks); use component props for layout, type and colour.`;
  const computedMessage = `A computed className must come from a table of \`${ns}-\` classes: add \`// eslint-disable-next-line no-restricted-syntax -- <table>\`.`;
  // A string compared with ===/!== (`dir === "next"`) is a condition, not a class.
  const literal = String.raw`Literal[value=/(^|\s)(?!${ns}-)\S/]:not(BinaryExpression[operator=/^[!=]==?$/] > Literal)`;
  const template = String.raw`TemplateElement[value.raw=/(^|\s)(?!${ns}-)[a-z]/]`;
  const computed = `JSXExpressionContainer > :matches(Identifier, MemberExpression, CallExpression)`;
  return [
    UI_TAG_SYNTAX,
    ...[lowerTag, COMPONENT_SELECTOR].flatMap((owner) => [
      {
        selector: `${owner} > ${classNameAttr} ${literal}`,
        message: classMessage,
      },
      {
        selector: `${owner} > ${classNameAttr} ${template}`,
        message: classMessage,
      },
      {
        selector: `${owner} > ${classNameAttr} > ${computed}`,
        message: computedMessage,
      },
    ]),
    {
      selector: "JSXAttribute[name.name='style']",
      message: `No style= in app code: use a component prop, a theme token or a \`${ns}-\` class. A runtime value keeps style= under \`// eslint-disable-next-line no-restricted-syntax -- <reason>\`.`,
    },
    {
      selector: "JSXAttribute[name.name='data-part']",
      message: `No data-part: use a \`${ns}-\` class.`,
    },
  ];
};

// react-v4 only: the site's grids use desktop-first CSS templates
// (max-width media queries) that `columns` cannot express.
const GRID_COLUMNS_SYNTAX = {
  selector:
    "JSXOpeningElement[name.name='Grid']:not(:has(JSXAttribute[name.name='columns']))",
  message:
    "Grid needs `columns`: use Stack for one vertical column and Flex for a row.",
};

// Recipes, cn and the spacing helpers are for component authors; app code
// uses the components' props. Shared by the react-v4 example rules.
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

// Plain examples: copy-paste component folders over the published kit
// (@duydpdev/style-generator/ui). className and style are allowed; the
// harness packages are not, so a copied folder needs only the package.
const PLAIN_APP_FILES = [
  "examples/plain-react/src/**/*.{ts,tsx}",
];

const PLAIN_RESTRICTED_IMPORTS = {
  patterns: [
    {
      group: [
        "design-system-example",
        "design-system-example/*",
        "react-v4-example",
        "react-v4-example/*",
      ],
      message:
        "Plain examples import only the package, their own files and src/theme.ts; the harness (design-system-example, react-v4-example) stays out.",
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
      "no-restricted-syntax": ["error", ...uiAppSyntax("s")],
      "no-restricted-imports": ["error", RESTRICTED_UI_IMPORTS],
    },
  },

  {
    files: ["examples/react-v4/src/**/*.{ts,tsx}"],
    ignores: UI_COMPONENT_FILES,
    rules: {
      "no-restricted-syntax": ["error", ...uiAppSyntax("x"), GRID_COLUMNS_SYNTAX],
    },
  },

  {
    files: PLAIN_APP_FILES,
    rules: {
      "no-restricted-imports": ["error", PLAIN_RESTRICTED_IMPORTS],
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='data-part']",
          message: "No data-part in plain apps: use className.",
        },
      ],
    },
  },

  // plain-nuxt SFCs: vue-eslint-parser hands <script lang="ts"> to the TS parser.
  // Type-aware rules stay off for .vue (the project service cannot open SFCs);
  // vue-tsc (`nuxt typecheck`) type-checks them, tests/nuxt/** included.
  // Auto-imports (useHead, useState) are declared in .nuxt/ types, so
  // no-undef is off, as typescript-eslint recommends for TS sources.
  {
    files: [
      "examples/plain-nuxt/app/**/*.vue",
      "examples/plain-nuxt/tests/**/*.vue",
    ],
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
  // plain-nuxt app code: copy-paste components, never the harness. The .ts
  // files are type-aware; run `yarn workspace plain-nuxt-example
  // prepare:nuxt` (after `yarn build:all`) before linting.
  {
    files: ["examples/plain-nuxt/app/**/*.{ts,vue}"],
    rules: {
      "no-restricted-imports": ["error", PLAIN_RESTRICTED_IMPORTS],
    },
  },
  // plain-nuxt stories import .vue files, which the type-aware project cannot
  // resolve (every value read from them is `any`), and .storybook/ and
  // vitest.config.ts belong to no Nuxt tsconfig project. vue-tsc
  // (`nuxt typecheck`) type-checks the stories; the rest lints untyped.
  {
    files: [
      "examples/plain-nuxt/app/ui/**/*.stories.ts",
      "examples/plain-nuxt/.storybook/**/*.ts",
      "examples/plain-nuxt/vitest.config.ts",
    ],
    extends: [pluginTs.configs.disableTypeChecked],
  },
  {
    files: ["examples/plain-nuxt/app/**/*.vue"],
    rules: {
      "vue/no-restricted-static-attribute": [
        "error",
        {
          key: "data-part",
          message: "No data-part in plain apps: use class.",
        },
      ],
      "vue/no-restricted-v-bind": [
        "error",
        {
          argument: "data-part",
          message: "No data-part in plain apps: use class.",
        },
      ],
    },
  },

  // The design-system DX tests run in Node (TypeScript Compiler API, fs).
  {
    files: ["examples/design-system/tests/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },

  // plain-react's Node scripts (copy-out smoke): plain JS like scripts/.
  {
    files: ["examples/plain-react/scripts/**/*.mjs"],
    extends: [pluginTs.configs.disableTypeChecked],
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
      "**/storybook-static/**",
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
