export type DocGroup = "Overview" | "Operations" | "Reference";

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
  slug?: string;
  title: string;
  group: DocGroup;
  order: number;
  badge?: string;
}

/** Per-file presentation, keyed by `repoPath`. Files not listed here fall back to their basename and first heading. */
const META: Record<string, DocMeta | undefined> = {
  "documents/architecture.md": {
    title: "Architecture",
    group: "Overview",
    order: 1,
  },
  "documents/guide.md": { title: "Guide", group: "Overview", order: 2 },
  "documents/deploy.md": { title: "Deploy", group: "Operations", order: 1 },
  "documents/testing.md": { title: "Testing", group: "Operations", order: 2 },
  "README.md": {
    slug: "reference",
    title: "Reference",
    group: "Reference",
    order: 1,
  },
  "documents/migration/4.x-to-5.0.md": {
    slug: "migration-4x-to-5",
    title: "Migration 4.x → 5.0",
    group: "Reference",
    order: 2,
  },
  "documents/migration/3.x-to-4.0.md": {
    slug: "migration-3x-to-4",
    title: "Migration 3.x → 4.0",
    group: "Reference",
    order: 3,
  },
};

function firstHeading(md: string): string | null {
  const m = /^#[ \t]+([^ \t].*)$/m.exec(md);
  return m ? m[1].trim() : null;
}

export const docs: DocEntry[] = Object.entries(raw)
  .map(([key, source]): DocEntry => {
    // `../../../documents/guide.md` → `documents/guide.md`
    const repoPath = key.replace(/^(?:\.\.\/)+/, "");
    const meta = META[repoPath];
    const slug =
      meta?.slug ?? repoPath.replace(/^.*\//, "").replace(/\.md$/, "");
    return {
      slug,
      title: meta?.title ?? firstHeading(source) ?? slug,
      source,
      repoPath,
      group: meta?.group ?? "Reference",
      order: meta?.order ?? 99,
      badge: meta?.badge,
    };
  })
  .sort((a, b) => {
    if (a.group !== b.group) {
      const groupOrder: Record<DocGroup, number> = {
        Overview: 0,
        Operations: 1,
        Reference: 2,
      };
      return groupOrder[a.group] - groupOrder[b.group];
    }
    return a.order - b.order;
  });

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
