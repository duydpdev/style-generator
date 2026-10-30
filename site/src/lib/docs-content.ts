import META_JSON from "./docs-meta.json";
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
}

// Keep in sync with DOC_GLOBS in `scripts/check-doc-links.mjs`.
const raw = import.meta.glob<string>(
  [
    "../../../documents/*.md",
    "!../../../documents/README.md",
    "../../../documents/getting-started/*.md",
    "../../../documents/reference/*.md",
    "../../../README.md",
    "../../../documents/migration/4.x-to-5.0.md",
    "../../../documents/migration/3.x-to-4.0.md",
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

export const docs: DocEntry[] = Object.entries(raw)
  .map(([key, source]): DocEntry => {
    // `../../../documents/guide.md` → `documents/guide.md`
    const repoPath = key.replace(/^(?:\.\.\/)+/, "");
    const meta = META[repoPath];
    if (!meta) {
      throw new Error(
        `site/src/lib/docs-meta.json has no entry for ${repoPath}`,
      );
    }
    return {
      slug: meta.slug,
      title: meta.title,
      source: stripHtmlComments(source),
      repoPath,
      group: meta.group,
      order: meta.order,
      badge: meta.badge,
    };
  })
  .sort((a, b) =>
    a.group === b.group
      ? a.order - b.order
      : GROUP_ORDER[a.group] - GROUP_ORDER[b.group],
  );

export function getDoc(slug: string): DocEntry | undefined {
  return docs.find((d) => d.slug === slug);
}

export const REPO_BLOB_URL =
  "https://github.com/duydpdev/style-generator/blob/main/";

export type DocLink =
  /** In-page `#anchor` or absolute URL: render untouched. */
  | { kind: "native"; href: string }
  /** Another doc the site renders: client-side route (`/docs/<slug>#anchor`). */
  | { kind: "internal"; to: string }
  /** Any other repo file: its GitHub blob URL. */
  | { kind: "repo"; href: string };

/** Classify a markdown link `href` found in the doc at `fromRepoPath`. */
export function resolveDocLink(href: string, fromRepoPath: string): DocLink {
  if (href.startsWith("#") || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) {
    return { kind: "native", href };
  }
  const url = new URL(href, `https://repo.invalid/${fromRepoPath}`);
  const repoPath = url.pathname.slice(1);
  const target = docs.find((d) => d.repoPath === decodeURIComponent(repoPath));
  if (target)
    return { kind: "internal", to: `/docs/${target.slug}${url.hash}` };
  return {
    kind: "repo",
    href: `${REPO_BLOB_URL}${repoPath}${url.search}${url.hash}`,
  };
}

export interface DocGroupEntry {
  group: DocGroup;
  docs: DocEntry[];
}

export function groupedDocs(): DocGroupEntry[] {
  const map = new Map<DocGroup, DocEntry[]>();
  for (const doc of docs) {
    const list = map.get(doc.group);
    if (list) list.push(doc);
    else map.set(doc.group, [doc]);
  }
  return Array.from(map.entries()).map(([group, list]) => ({
    group,
    docs: list,
  }));
}

export function adjacentDocs(slug: string): {
  prev?: DocEntry;
  next?: DocEntry;
} {
  const idx = docs.findIndex((d) => d.slug === slug);
  if (idx < 0) return {};
  return {
    prev: idx > 0 ? docs[idx - 1] : undefined,
    next: idx < docs.length - 1 ? docs[idx + 1] : undefined,
  };
}
