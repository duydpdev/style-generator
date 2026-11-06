import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Write one file of a throwaway test project, creating its parent folders.
 * @param {string} root - The project root (a temp folder)
 * @param {string} rel - Path of the file below `root`
 * @param {string | object} content - Written verbatim when a string, otherwise as `JSON.stringify(content)`
 * @returns {string} Absolute path of the file
 */
export const writeTmpFile = (
  root: string,
  rel: string,
  content: string | object,
): string => {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(
    abs,
    typeof content === "string" ? content : JSON.stringify(content),
  );
  return abs;
};
