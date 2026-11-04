import type { AlertKind } from "./doc-alerts";
import type { DocGroup } from "./docs-content";

/** Language of a docs page: `en` (source of truth) or its twin under `documents/vi/`. */
export type Locale = "en" | "vi";

const VI_DIR = "documents/vi/";

/** Locale of a router pathname (basename removed): `/vi` and `/vi/…` are Vietnamese. */
export function localeOfPath(pathname: string): Locale {
  return pathname === "/vi" || pathname.startsWith("/vi/") ? "vi" : "en";
}

/** Locale of a rendered markdown file, by its repo path. */
export function localeOfRepoPath(repoPath: string): Locale {
  return repoPath.startsWith(VI_DIR) ? "vi" : "en";
}

/**
 * English source of a twin: `documents/vi/README.md` → `README.md`,
 * `documents/vi/<p>` → `documents/<p>`. Keep in sync with `viTwinOf` in
 * `scripts/doc-markdown.mjs`.
 */
export function enSourceOf(viPath: string): string {
  const rest = viPath.slice(VI_DIR.length);
  return rest === "README.md" ? "README.md" : `documents/${rest}`;
}

/** Route of the docs index (no slug) or of one page, in a locale. */
export function docPath(locale: Locale, slug?: string): string {
  const base = locale === "vi" ? "/vi/docs" : "/docs";
  return slug === undefined ? base : `${base}/${slug}`;
}

/** Hand-written table-of-contents headings, lowercase, one per locale. */
export const TOC_TITLES: readonly string[] = ["table of contents", "mục lục"];

/** The docs chrome strings of one locale. */
export interface UiText {
  docs: string;
  groups: Readonly<Record<DocGroup, string>>;
  atAGlance: string;
  syncedFrom: string;
  lockstep: string;
  upToDate: string;
  fileLabel: string;
  groupLabel: string;
  readLabel: string;
  minutes: (n: number) => string;
  documentation: string;
  versionLabel: string;
  licenseLabel: string;
  sourceLabel: string;
  docsLabel: string;
  pages: (n: number) => string;
  allPages: string;
  next: string;
  previous: string;
  editPage: string;
  reportIssue: string;
  backToTop: string;
  editOnGitHub: string;
  onThisPage: string;
  sections: (n: number) => string;
  alerts: Readonly<Record<AlertKind, string>>;
  diagramSource: string;
  notFound: string;
  docWord: string;
  doesNotExist: string;
  pageMissing: string;
  landingPage: string;
  examples: string;
  /** Label of the breadcrumb link to the other language. */
  switchTo: string;
}

/** `en` keeps the exact strings the site rendered before the mirror. */
export const UI_TEXT: Readonly<Record<Locale, UiText>> = {
  en: {
    docs: "Docs",
    groups: {
      Start: "Start",
      Guides: "Guides",
      Reference: "Reference",
      Overview: "Overview",
      Operations: "Operations",
      Migration: "Migration",
    },
    atAGlance: "at a glance.",
    syncedFrom: "— synced from",
    lockstep: ". All artifacts stay in lockstep with the source.",
    upToDate: "up to date",
    fileLabel: "FILE",
    groupLabel: "GROUP",
    readLabel: "READ",
    minutes: (n) => `~${String(n)} min`,
    documentation: "Documentation",
    versionLabel: "VERSION",
    licenseLabel: "LICENSE",
    sourceLabel: "SOURCE",
    docsLabel: "DOCS",
    pages: (n) => `${String(n)} pages`,
    allPages: "All pages",
    next: "Next →",
    previous: "← Previous",
    editPage: "Edit this page on GitHub ↗",
    reportIssue: "Report an issue ↗",
    backToTop: "Back to top ↑",
    editOnGitHub: "Edit on GitHub",
    onThisPage: "On this page",
    sections: (n) => `${String(n)} sections`,
    alerts: {
      NOTE: "Note",
      TIP: "Tip",
      IMPORTANT: "Important",
      WARNING: "Warning",
      CAUTION: "Caution",
    },
    diagramSource: "Diagram source (mermaid)",
    notFound: "Not found",
    docWord: "Doc",
    doesNotExist: "does not exist.",
    pageMissing: "This page does not exist.",
    landingPage: "Landing page",
    examples: "Examples",
    switchTo: "Tiếng Việt",
  },
  vi: {
    docs: "Tài liệu",
    groups: {
      Start: "Bắt đầu",
      Guides: "Hướng dẫn",
      Reference: "Tham chiếu",
      Overview: "Tổng quan",
      Operations: "Vận hành",
      Migration: "Nâng cấp",
    },
    atAGlance: "tóm lược.",
    syncedFrom: "— đồng bộ từ",
    lockstep: ". Bản dịch được kiểm tra khớp với bản gốc tiếng Anh.",
    upToDate: "đã đồng bộ",
    fileLabel: "TỆP",
    groupLabel: "NHÓM",
    readLabel: "ĐỌC",
    minutes: (n) => `~${String(n)} phút`,
    documentation: "Tài liệu",
    versionLabel: "PHIÊN BẢN",
    licenseLabel: "GIẤY PHÉP",
    sourceLabel: "MÃ NGUỒN",
    docsLabel: "TÀI LIỆU",
    pages: (n) => `${String(n)} trang`,
    allPages: "Tất cả các trang",
    next: "Tiếp →",
    previous: "← Trước",
    editPage: "Sửa trang này trên GitHub ↗",
    reportIssue: "Báo lỗi ↗",
    backToTop: "Lên đầu trang ↑",
    editOnGitHub: "Sửa trên GitHub",
    onThisPage: "Trong trang này",
    sections: (n) => `${String(n)} mục`,
    alerts: {
      NOTE: "Ghi chú",
      TIP: "Mẹo",
      IMPORTANT: "Quan trọng",
      WARNING: "Cảnh báo",
      CAUTION: "Thận trọng",
    },
    diagramSource: "Mã nguồn sơ đồ (mermaid)",
    notFound: "Không tìm thấy",
    docWord: "Trang",
    doesNotExist: "không tồn tại.",
    pageMissing: "Trang này không tồn tại.",
    landingPage: "Trang chủ",
    examples: "Ví dụ",
    switchTo: "English",
  },
};
