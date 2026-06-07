import { createRequire } from "node:module";

/**
 * Auto-detect the installed Tailwind CSS major version.
 * Returns 4 if tailwindcss v4.x is found, otherwise defaults to 3.
 * @param {() => { version?: string }} [loadPkg] - Optional loader for `tailwindcss/package.json` (for tests).
 * @returns {3 | 4} Detected Tailwind CSS major version
 */
export const detectTailwindVersion = (
  loadPkg: () => { version?: string } = defaultLoadPkg,
): 3 | 4 => {
  try {
    const tw = loadPkg();
    return tw.version?.startsWith("4") ? 4 : 3;
  } catch {
    return 3;
  }
};

const defaultLoadPkg = (): { version?: string } => {
  const esmRequire = createRequire(import.meta.url);
  return esmRequire("tailwindcss/package.json") as { version?: string };
};
