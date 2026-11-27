import { createHash } from "node:crypto";

/** `ds-stamp.json`: what a design-system build was made from. No git state: it must build outside a checkout. */
export interface DsStamp {
  libVersion: string;
  themeSha256: string;
  presetSha256: string;
  tailwindVersion: string;
}

const sha256 = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

/**
 * @param {object} input - The inputs of the build
 * @param {string} input.libVersion - This package's version
 * @param {Uint8Array} input.themeBytes - The theme file as read
 * @param {Uint8Array} input.presetBytes - The preset file as read
 * @param {string} input.tailwindVersion - The `tailwindcss` that compiled the CSS
 * @returns {DsStamp} The stamp
 */
export function makeStamp(input: {
  libVersion: string;
  themeBytes: Uint8Array;
  presetBytes: Uint8Array;
  tailwindVersion: string;
}): DsStamp {
  return {
    libVersion: input.libVersion,
    themeSha256: sha256(input.themeBytes),
    presetSha256: sha256(input.presetBytes),
    tailwindVersion: input.tailwindVersion,
  };
}

/**
 * Whether a stamp's library version is the installed one for this purpose: the same major and minor
 * (a patch release does not change what a design system renders).
 * @param {string} installed - The installed package version
 * @param {unknown} stamped - `libVersion` read from a stamp
 * @returns {boolean} True when major.minor agree
 */
export function sameMinor(installed: string, stamped: unknown): boolean {
  const minor = (version: string): string =>
    version.split(".").slice(0, 2).join(".");
  return typeof stamped === "string" && minor(installed) === minor(stamped);
}
