import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repo = fileURLToPath(new URL("../..", import.meta.url));
const src = join(repo, "src");

const LINK =
  /https:\/\/github\.com\/duydpdev\/style-generator\/blob\/([^/\s]+)\/([^\s)"'`#]+)(?:#([\w-]+))?/g;

/**
 * GitHub's anchor for a Markdown heading.
 * @param {string} heading - The heading text
 * @returns {string} Its slug
 */
const slug = (heading: string): string =>
  heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s/g, "-");

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.name.endsWith(".ts") && !/\.test(-d)?\.ts$/.test(entry.name)
      ? [full]
      : [];
  });

/** F6: a message shipped in `dist` links docs by URL, and the URL must resolve. */
describe("links in shipped messages", () => {
  const links = sourceFiles(src).flatMap((file) =>
    [...readFileSync(file, "utf8").matchAll(LINK)].map(
      ([url, ref, path, anchor]) => ({
        url,
        ref: ref ?? "",
        path: path ?? "",
        anchor,
        from: relative(repo, file),
      }),
    ),
  );

  it("finds the links the runtime messages carry", () => {
    expect(links.map((l) => l.path)).toContain(
      "documents/migration/7.x-to-8.0.md",
    );
  });

  it.each(links.map((l) => [l.from, l.url, l] as const))(
    "%s → %s points at an existing file and heading",
    (_from, _url, link) => {
      expect(link.ref === "main" || /^v\d/.test(link.ref)).toBe(true);
      const file = join(repo, link.path);
      expect(existsSync(file)).toBe(true);
      if (link.anchor !== undefined) {
        const headings = readFileSync(file, "utf8")
          .split("\n")
          .filter((line) => /^#{1,6} /.test(line))
          .map((line) => slug(line.replace(/^#+ /, "")));
        expect(headings).toContain(link.anchor);
      }
    },
  );

  it("no runtime message names a repo path that the package does not ship", () => {
    const bare = sourceFiles(src).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => line.includes("see documents/"))
        .map((line) => `${relative(repo, file)}: ${line.trim()}`),
    );
    expect(bare).toEqual([]);
  });
});
