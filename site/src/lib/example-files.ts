import type { Lang } from "./tokenize";

export type Variant = "v3" | "v4";

export interface ExampleFile {
  path: string;
  code: string;
  lang: Lang;
}

export interface ExampleSection {
  section: string;
  files: ExampleFile[];
}

const v4Raw = import.meta.glob(
  "../../../examples/react-v4/**/*.{ts,tsx,js,jsx,css,json,html}",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const v3Raw = import.meta.glob(
  "../../../examples/react-v3/**/*.{ts,tsx,js,jsx,css,json,html}",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const EXCLUDE_PATTERNS = [
  /node_modules\//,
  /\/dist\//,
  /package-lock\.json$/,
  /tsconfig\.[^.]*\.json$/,
];

function shouldInclude(path: string): boolean {
  return !EXCLUDE_PATTERNS.some((re) => re.test(path));
}

function langFromExt(path: string): Lang {
  if (/\.(tsx|jsx|ts|js)$/.test(path)) return "ts";
  if (/\.css$/.test(path)) return "css";
  if (/\.json$/.test(path)) return "json";
  return "text";
}

function relativePath(fullPath: string, variant: Variant): string {
  const marker = `examples/react-${variant}/`;
  const idx = fullPath.indexOf(marker);
  if (idx < 0) return fullPath;
  return fullPath.slice(idx + marker.length);
}

function classify(rel: string): string {
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
];

function buildVariant(
  raw: Record<string, string>,
  variant: Variant,
): ExampleSection[] {
  const sections = new Map<string, ExampleFile[]>();

  for (const [fullPath, code] of Object.entries(raw)) {
    if (!shouldInclude(fullPath)) continue;
    const rel = relativePath(fullPath, variant);
    const section = classify(rel);
    if (!sections.has(section)) sections.set(section, []);
    sections.get(section)!.push({
      path: rel,
      code,
      lang: langFromExt(rel),
    });
  }

  for (const list of sections.values()) {
    list.sort((a, b) => a.path.localeCompare(b.path));
  }

  return SECTION_ORDER.filter((s) => sections.has(s)).map((section) => ({
    section,
    files: sections.get(section)!,
  }));
}

export const EXAMPLE_FILES: Record<Variant, ExampleSection[]> = {
  v3: buildVariant(v3Raw, "v3"),
  v4: buildVariant(v4Raw, "v4"),
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
