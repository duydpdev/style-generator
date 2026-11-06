import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Write `data` to `filePath` atomically: render to a sibling temp file, then
 * `renameSync` over the real target. `rename(2)` is atomic on POSIX/NTFS as
 * long as source and destination share a filesystem — the temp file lives in
 * the same directory as the target — so a concurrent reader (Tailwind's
 * `@tailwindcss/postcss`/`@tailwindcss/vite`, Turbopack's CSS loader) never
 * observes a partially-written file. The parent directory MUST already exist.
 *
 * On a failed write/rename the temp file is removed; after a successful
 * rename the cleanup is a no-op (`force` swallows ENOENT).
 * @param {string} filePath - Target file path (its directory must exist)
 * @param {string} data - UTF-8 file contents
 */
export const writeFileAtomic = (filePath: string, data: string): void => {
  const tmpFile = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${String(process.pid)}.${randomUUID()}.tmp`,
  );
  try {
    fs.writeFileSync(tmpFile, data, "utf8");
    fs.renameSync(tmpFile, filePath);
  } finally {
    fs.rmSync(tmpFile, { force: true });
  }
};
