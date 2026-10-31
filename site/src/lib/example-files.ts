import type { Lang } from "./tokenize";

export type Variant = "v4";

export interface ExampleFile {
  path: string;
  code: string;
  lang: Lang;
}

export interface ExampleSection {
  section: string;
  files: ExampleFile[];
}

const v4Raw = import.meta.glob<string>(
  "../../../examples/react-v4/**/*.{ts,tsx,js,jsx,css,json,html}",
  { query: "?raw", import: "default", eager: true },
);

const designSystemRaw = import.meta.glob<string>(
  "../../../examples/design-system/**/*.{ts,css,json}",
  { query: "?raw", import: "default", eager: true },
);

const EXCLUDE_PATTERNS = [
  /node_modules\//,
  /\/dist\//,
  /\/theme\/theme\.css$/,
  /tsconfig\.[^.]*\.json$/,
  // design-system: DX tests (they need the TypeScript compiler, not a demo
  // read) and the generated stylesheet.
  /examples\/design-system\/tests\//,
  /examples\/design-system\/src\/styles\/theme\.css$/,
];

function shouldInclude(path: string): boolean {
  return !EXCLUDE_PATTERNS.some((re) => re.test(path));
}

function langFromExt(path: string): Lang {
  if (/\.(tsx|jsx|ts|js)$/.test(path)) return "ts";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  return "text";
}

const DESIGN_SYSTEM_DIR = "design-system";

/**
 * Path shown in the explorer: react-v4 files keep their app-relative path,
 * design-system files are prefixed with `design-system/` so the two never
 * collide (`src/theme.json` vs `src/theme/…`).
 * @param fullPath - Glob key
 * @param variant - Explorer variant (`v4` → `examples/react-v4`)
 * @returns Explorer path
 */
function relativePath(fullPath: string, variant: Variant): string {
  const dsMarker = `examples/${DESIGN_SYSTEM_DIR}/`;
  const dsIdx = fullPath.indexOf(dsMarker);
  if (dsIdx >= 0) {
    return `${DESIGN_SYSTEM_DIR}/${fullPath.slice(dsIdx + dsMarker.length)}`;
  }
  const marker = `examples/react-${variant}/`;
  const idx = fullPath.indexOf(marker);
  if (idx < 0) return fullPath;
  return fullPath.slice(idx + marker.length);
}

function classify(rel: string): string {
  if (rel.startsWith(`${DESIGN_SYSTEM_DIR}/`)) return "Design system";
  if (rel.startsWith("src/components/")) return "Components";
  if (rel.startsWith("src/sections/")) return "Sections";
  if (rel.startsWith("src/theme/")) return "Theme";
  if (rel.startsWith("src/lib/")) return "Lib";
  if (rel.startsWith("src/")) return "Entry";
  return "Config";
}

const SECTION_ORDER = [
  "Entry",
  "Components",
  "Sections",
  "Theme",
  "Lib",
  "Config",
  "Design system",
];

/** Drop `#region docs:` / `#endregion docs:` marker lines (they feed scripts/docs-embed.mjs). */
function stripDocRegions(code: string): string {
  return code.replace(/^.*#(?:end)?region docs:.*(?:\r?\n|$)/gm, "");
}

function buildVariant(
  raw: Record<string, string>,
  variant: Variant,
): ExampleSection[] {
  const sections = new Map<string, ExampleFile[]>();

  for (const [fullPath, code] of Object.entries(raw)) {
    if (!shouldInclude(fullPath)) continue;
    const rel = relativePath(fullPath, variant);
    const section = classify(rel);
    const entry = {
      path: rel,
      code: stripDocRegions(code),
      lang: langFromExt(rel),
    };
    const list = sections.get(section);
    if (list) list.push(entry);
    else sections.set(section, [entry]);
  }

  for (const list of sections.values()) {
    list.sort((a, b) => a.path.localeCompare(b.path));
  }

  return SECTION_ORDER.flatMap((section) => {
    const files = sections.get(section);
    return files ? [{ section, files }] : [];
  });
}

export const EXAMPLE_FILES: Record<Variant, ExampleSection[]> = {
  v4: buildVariant({ ...v4Raw, ...designSystemRaw }, "v4"),
};

export function flatFiles(variant: Variant): ExampleFile[] {
  return EXAMPLE_FILES[variant].flatMap((s) => s.files);
}

export function fileCount(variant: Variant): number {
  return flatFiles(variant).length;
}

export function findFile(
  variant: Variant,
  path: string,
): ExampleFile | undefined {
  return flatFiles(variant).find((f) => f.path === path);
}
