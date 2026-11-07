/**
 * The sample components the example apps render (react-v4)
 * and the lowercase tags app code must not use instead. eslint.config.js
 * builds its JSX selectors from these lists.
 */
export const UI_COMPONENTS = Object.freeze([
  {
    name: "Box",
    tags: [
      "div",
      "section",
      "header",
      "footer",
      "aside",
      "main",
      "nav",
      "article",
    ],
  },
  { name: "Flex", tags: [] },
  { name: "Stack", tags: [] },
  { name: "Grid", tags: [] },
  { name: "Text", tags: ["span", "p", "h1", "h2", "h3", "h4", "h5", "h6"] },
  { name: "Button", tags: ["button"] },
]);

/** Component names, in registry order. */
export const UI_COMPONENT_NAMES = Object.freeze(
  UI_COMPONENTS.map((c) => c.name),
);

/** Tags banned in app code (positive list). */
export const BANNED_TAGS = Object.freeze([
  ...new Set(UI_COMPONENTS.flatMap((c) => c.tags)),
]);
