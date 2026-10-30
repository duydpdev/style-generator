const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const COMMENT_LINE = /^[ \t]*<!--.*-->[ \t]*$/;

/**
 * Drop single-line HTML comments (`<!-- embed: … -->`, `<!-- signature: … -->`,
 * `<!-- snippet: … -->`) that sit outside fenced code. They steer the repo's doc
 * scripts only; react-markdown would print them as text.
 * @param md - Markdown source
 * @returns The source without those lines
 */
export function stripHtmlComments(md: string): string {
  let fence: string | null = null;
  const kept: string[] = [];
  for (const line of md.split("\n")) {
    const m = FENCE.exec(line);
    if (m) {
      const marker = m[1];
      if (fence === null) fence = marker;
      else if (marker.startsWith(fence[0]) && marker.length >= fence.length) {
        fence = null;
      }
    }
    if (fence === null && !m && COMMENT_LINE.test(line)) continue;
    kept.push(line);
  }
  return kept.join("\n");
}
