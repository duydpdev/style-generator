/**
 * Auto-detect the installed Tailwind CSS major version.
 * Returns 4 if tailwindcss v4.x is found, otherwise defaults to 3.
 * @returns {3 | 4} Detected Tailwind CSS major version
 */
export const detectTailwindVersion = (): 3 | 4 => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tw = require("tailwindcss/package.json") as { version?: string };
    return tw.version?.startsWith("4") ? 4 : 3;
  } catch {
    return 3;
  }
};
