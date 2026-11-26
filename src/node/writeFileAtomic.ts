import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Rationale: documents/architecture.md#writefileatomic-why-rename-over-write
/**
 * Write `data` to `filePath` through a sibling temp file renamed over it.
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
