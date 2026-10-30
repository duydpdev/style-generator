/**
 * Every ui-react component and the lowercase tags app code must not use
 * once that component exists (eslint.config.js reads it from phase 06 on).
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
  { name: "Container", tags: [] },
  {
    name: "Text",
    tags: ["span", "p", "h1", "h2", "h3", "h4", "h5", "h6"],
  },
  { name: "Button", tags: ["button"] },
  { name: "Card", tags: [] },
  { name: "Badge", tags: [] },
  { name: "Input", tags: ["input"] },
  { name: "Select", tags: ["select"] },
  { name: "Dialog", tags: [] },
]);

/** Component names, in registry order. */
export const UI_COMPONENT_NAMES = Object.freeze(
  UI_COMPONENTS.map((c) => c.name),
);

/** Tags banned in migrated app code (positive list). */
export const BANNED_TAGS = Object.freeze([
  ...new Set(UI_COMPONENTS.flatMap((c) => c.tags)),
]);
