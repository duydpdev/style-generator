/**
 * One CSS block, `head { body }`, with the body on its own lines. Nesting is
 * the caller's: pass the already-indented inner block as `body` and the
 * outer block's `indent` for a block that sits inside another one.
 * @param {string} head - Selector or at-rule prelude, e.g. `:root` or `@utility sp-md`
 * @param {string} body - Declarations or nested blocks, already indented and joined by newlines
 * @param {string} [indent] - Indent of the block itself (its own head and closing brace)
 * @returns {string} The block, without a trailing newline
 */
export const cssBlock = (head: string, body: string, indent = ""): string =>
  `${indent}${head} {\n${body}\n${indent}}`;
