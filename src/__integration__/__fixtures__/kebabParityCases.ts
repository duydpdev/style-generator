/**
 * Shared table for the runtime/type parity check of `toKebabCase` (runtime,
 * `shared/helpers.ts`) vs `KebabCase` (type, `core/inference.ts`). The runtime
 * test (`kebab-parity.test.ts`) asserts `toKebabCase(key) === kebab`; the type
 * test (`core/inference.test-d.ts`) asserts `KebabCase<key> === kebab`. Both
 * read this one `as const` table, so the two implementations cannot drift
 * apart without one of the gates failing.
 */
export const kebabParityCases = [
  { key: "primary", kebab: "primary" },
  { key: "primaryBlue", kebab: "primary-blue" },
  { key: "sidebarForeground", kebab: "sidebar-foreground" },
  { key: "primaryFG", kebab: "primary-fg" },
  { key: "HTMLParser", kebab: "htmlparser" },
  { key: "blue500", kebab: "blue-500" },
  { key: "gray100", kebab: "gray-100" },
  { key: "h1", kebab: "h-1" },
  { key: "2xl", kebab: "2xl" },
  { key: "500Blue", kebab: "500-blue" },
  { key: "text12Mono", kebab: "text-12-mono" },
  { key: "text2xl", kebab: "text-2xl" },
  { key: "fooA1", kebab: "foo-a-1" },
  { key: "a_B", kebab: "a_b" },
  { key: "already-kebab", kebab: "already-kebab" },
] as const;
