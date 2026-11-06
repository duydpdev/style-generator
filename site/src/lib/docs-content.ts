import META_JSON from "./docs-meta.json";
import type { Locale } from "./locale";
import { docPath, enSourceOf, localeOfRepoPath } from "./locale";
import { stripHtmlComments } from "./strip-html-comments";

export type DocGroup =
  | "Start"
  | "Guides"
  | "Reference"
  | "Overview"
  | "Operations"
  | "Migration";

export interface DocEntry {
  slug: string;
  title: string;
  source: string;
  /** Path of the markdown file relative to the repository root (POSIX). */
  repoPath: string;
  group: DocGroup;
  order: number;
  badge?: string;
  /** `en` for the source file, `vi` for its twin under `documents/vi/`. */
  locale: Locale;
}

// Keep in sync with EN_DOC_FILES (and their vi twins) in `site/scripts/check-doc-links.mjs`.
const raw = import.meta.glob<string>(
  [
    "../../../documents/*.md",
    "!../../../documents/README.md",
    "../../../documents/getting-started/*.md",
    "../../../documents/reference/*.md",
    "../../../README.md",
    "../../../documents/migration/5.x-to-6.0.md",
    "../../../documents/migration/4.x-to-5.0.md",
    "../../../documents/migration/3.x-to-4.0.md",
    "../../../documents/vi/*.md",
    "../../../documents/vi/getting-started/*.md",
    "../../../documents/vi/reference/*.md",
    "../../../documents/vi/migration/5.x-to-6.0.md",
    "../../../documents/vi/migration/4.x-to-5.0.md",
    "../../../documents/vi/migration/3.x-to-4.0.md",
  ],
  {
    query: "?raw",
    import: "default",
    eager: true,
  },
);

interface DocMeta {
  slug: string;
  title: string;
  group: DocGroup;
  order: number;
  badge?: string;
  /** Presentation of the twin under `documents/vi/`. */
  vi: { title: string };
}

/** Per-file presentation, keyed by `repoPath`; `site/scripts/check-doc-links.mjs` fails when a rendered file has no entry. */
const META = META_JSON as Record<string, DocMeta | undefined>;
const GROUP_ORDER: Record<DocGroup, number> = {
  Start: 0,
  Guides: 1,
  Reference: 2,
  Overview: 3,
  Operations: 4,
  Migration: 5,
};

const allDocs: DocEntry[] = Object.entries(raw)
  .map(([key, source]): DocEntry => {
    // `../../../documents/guide.md` → `documents/guide.md`
    const repoPath = key.replace(/^(?:\.\.\/)+/, "");
    const locale = localeOfRepoPath(repoPath);
    const metaKey = locale === "vi" ? enSourceOf(repoPath) : repoPath;
    const meta = META[metaKey];
    if (!meta) {
      throw new Error(
        `site/src/lib/docs-meta.json has no entry for ${metaKey}`,
      );
    }
    return {
      slug: meta.slug,
      title: locale === "vi" ? meta.vi.title : meta.title,
      source: stripHtmlComments(source),
      repoPath,
      group: meta.group,
      order: meta.order,
      badge: meta.badge,
      locale,
    };
  })
  .sort((a, b) =>
    a.group === b.group
      ? a.order - b.order
      : GROUP_ORDER[a.group] - GROUP_ORDER[b.group],
  );

const DOCS: Readonly<Record<Locale, DocEntry[]>> = {
  en: allDocs.filter((d) => d.locale === "en"),
  vi: allDocs.filter((d) => d.locale === "vi"),
};

/** The rendered docs of one locale, in navigation order. */
export function docsOf(locale: Locale): DocEntry[] {
  return DOCS[locale];
}

export function getDoc(slug: string, locale: Locale): DocEntry | undefined {
  return DOCS[locale].find((d) => d.slug === slug);
}

export const REPO_BLOB_URL =
  "https://github.com/duydpdev/style-generator/blob/main/";

export type DocLink =
  /** In-page `#anchor` or absolute URL: render untouched. */
  | { kind: "native"; href: string }
  /** Another doc the site renders: client-side route (`/docs/<slug>#anchor`, `/vi/docs/<slug>#anchor` for a twin). */
  | { kind: "internal"; to: string }
  /** Any other repo file: its GitHub blob URL. */
  | { kind: "repo"; href: string };

/**
 * Classify a markdown link `href` found in the doc at `fromRepoPath`. An
 * absolute `REPO_BLOB_URL` link (README.md uses them so the published package
 * page works off GitHub) is treated like the repo-relative link it points to.
 */
export function resolveDocLink(href: string, fromRepoPath: string): DocLink {
  const local = href.startsWith(REPO_BLOB_URL)
    ? `/${href.slice(REPO_BLOB_URL.length)}`
    : href;
  if (local.startsWith("#") || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(local)) {
    return { kind: "native", href };
  }
  const url = new URL(local, `https://repo.invalid/${fromRepoPath}`);
  const repoPath = url.pathname.slice(1);
  const target = allDocs.find(
    (d) => d.repoPath === decodeURIComponent(repoPath),
  );
  if (target)
    return {
      kind: "internal",
      to: `${docPath(target.locale, target.slug)}${url.hash}`,
    };
  return {
    kind: "repo",
    href: `${REPO_BLOB_URL}${repoPath}${url.search}${url.hash}`,
  };
}

export interface DocGroupEntry {
  group: DocGroup;
  docs: DocEntry[];
}

export function groupedDocs(locale: Locale): DocGroupEntry[] {
  const map = new Map<DocGroup, DocEntry[]>();
  for (const doc of DOCS[locale]) {
    const list = map.get(doc.group);
    if (list) list.push(doc);
    else map.set(doc.group, [doc]);
  }
  return Array.from(map.entries()).map(([group, list]) => ({
    group,
    docs: list,
  }));
}

export function adjacentDocs(
  slug: string,
  locale: Locale,
): {
  prev?: DocEntry;
  next?: DocEntry;
} {
  const docs = DOCS[locale];
  const idx = docs.findIndex((d) => d.slug === slug);
  if (idx < 0) return {};
  return {
    prev: idx > 0 ? docs[idx - 1] : undefined,
    next: idx < docs.length - 1 ? docs[idx + 1] : undefined,
  };
}
