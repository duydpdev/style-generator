export type DocGroup = "Overview" | "Operations" | "Reference";

export interface DocEntry {
  slug: string;
  title: string;
  source: string;
  group: DocGroup;
  order: number;
  badge?: string;
}

const raw = import.meta.glob("../../../docs/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const META: Record<
  string,
  { title: string; group: DocGroup; order: number; badge?: string }
> = {
  architecture: { title: "Architecture", group: "Overview", order: 1 },
  guide: { title: "Guide", group: "Overview", order: 2 },
  deploy: { title: "Deploy", group: "Operations", order: 1 },
  testing: { title: "Testing", group: "Operations", order: 2 },
};

function firstHeading(md: string): string | null {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

function slugFromPath(p: string): string {
  return p.replace(/^.*\//, "").replace(/\.md$/, "");
}

export const docs: DocEntry[] = Object.entries(raw)
  .map(([path, source]): DocEntry => {
    const slug = slugFromPath(path);
    const meta = META[slug];
    return {
      slug,
      title: meta?.title ?? firstHeading(source) ?? slug,
      source,
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

export interface DocGroupEntry {
  group: DocGroup;
  docs: DocEntry[];
}

export function groupedDocs(): DocGroupEntry[] {
  const map = new Map<DocGroup, DocEntry[]>();
  for (const doc of docs) {
    if (!map.has(doc.group)) map.set(doc.group, []);
    map.get(doc.group)!.push(doc);
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
