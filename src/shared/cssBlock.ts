/**
 * One CSS block, `head { body }`, with the body on its own lines; nesting is the caller's.
 * @param {string} head - Selector or at-rule prelude, e.g. `:root` or `@utility sp-md`
 * @param {string} body - Declarations or nested blocks, already indented and joined by newlines
 * @param {string} [indent] - Indent of the block's own head and closing brace, for a block nested in another
 * @returns {string} The block, without a trailing newline
 */
export const cssBlock = (head: string, body: string, indent = ""): string =>
  `${indent}${head} {\n${body}\n${indent}}`;
