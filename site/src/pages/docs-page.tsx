import { useEffect, useRef } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";

import { DocMarkdown } from "../components/doc-markdown";
import { DocsOnPage } from "../components/docs-onpage";
import { DocsSidebar } from "../components/docs-sidebar";
import { Topbar } from "../components/topbar";
import { adjacentDocs, docs, getDoc, REPO_BLOB_URL } from "../lib/docs-content";
import { useTheme } from "../lib/use-theme";

import { NotFound } from "./not-found";

function approxReadMinutes(source: string): number {
  const words = source.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

export function DocsPage() {
  const { slug } = useParams<{ slug?: string }>();
  const { hash } = useLocation();
  const { toggle } = useTheme();
  const contentRef = useRef<HTMLElement | null>(null);

  // New doc → top; `#anchor` (in-page or from another doc) → that heading.
  useEffect(() => {
    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      // Malformed escape in the URL: look the raw fragment up as-is.
    }
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [slug, hash]);

  // Tag the in-content "Mục lục" block so docs.css can restyle it to match
  // the landing-page TOC look. Match by heading text (resilient to rehype-slug
  // Unicode ID variations) and only apply when the next sibling is a <ul>.
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const raf = requestAnimationFrame(() => {
      const headings = root.querySelectorAll<HTMLHeadingElement>("h2");
      headings.forEach((h) => {
        const text = h.textContent.trim().toLowerCase();
        if (text !== "mục lục") return;
        const next = h.nextElementSibling;
        if (!next || (next.tagName !== "UL" && next.tagName !== "OL")) return;
        h.classList.add("md-toc-heading");
        next.classList.add("md-toc");
      });
    });
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [slug]);

  if (!slug) {
    return <Navigate to={`/docs/${docs[0]?.slug ?? "guide"}`} replace />;
  }

  const doc = getDoc(slug);
  const { prev, next } = adjacentDocs(slug);

  if (!doc) return <NotFound missingDoc={slug} />;

  // The page header already renders the title as an <h1>; drop the file's own.
  const lines = doc.source.split("\n");
  const titleAt = lines.findIndex((l) => l.trim() !== "");
  const body =
    titleAt >= 0 && lines[titleAt].startsWith("# ")
      ? lines.slice(titleAt + 1).join("\n")
      : doc.source;
  const readMin = approxReadMinutes(body);
  const ghUrl = `${REPO_BLOB_URL}${doc.repoPath}`;

  return (
    <>
      <Topbar activeChapter={null} activeRoute="docs" onToggleTheme={toggle} />
      <div className="docs-shell">
        <DocsSidebar activeSlug={doc.slug} />

        <main className="docs-content" ref={contentRef}>
          <div className="doc-breadcrumb">
            <Link to="/docs">Docs</Link>
            <span className="sep">/</span>
            <span>{doc.group}</span>
            <span className="sep">/</span>
            <b>{doc.title}</b>
          </div>

          <header className="doc-head reveal is-in">
            <div>
              <h1>
                {doc.title}
                <em> at a glance.</em>
              </h1>
              <p className="lede">
                <b>{doc.title}</b> — synced from <code>{doc.repoPath}</code>.
                All artifacts stay in lockstep with the source.
              </p>
            </div>
            <div className="doc-meta">
              <div className="row">
                <span className="pulse" />
                <span>up to date</span>
              </div>
              <div className="row">
                <span>FILE</span>
                <code>{doc.repoPath}</code>
              </div>
              <div className="row">
                <span>GROUP</span>
                <span>{doc.group}</span>
              </div>
              <div className="row">
                <span>READ</span>
                <span>~{readMin} min</span>
              </div>
            </div>
          </header>

          <article className="doc-body">
            <DocMarkdown source={body} repoPath={doc.repoPath} />
          </article>

          <div className="doc-footer">
            {prev ? (
              <Link to={`/docs/${prev.slug}`} className="nav-card prev">
                <span className="lbl">← Previous</span>
                <span className="ttl">
                  <em>{prev.title}</em>
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link to={`/docs/${next.slug}`} className="nav-card next">
                <span className="lbl">Next →</span>
                <span className="ttl">
                  <em>{next.title}</em>
                </span>
              </Link>
            ) : (
              <span />
            )}
          </div>

          <div className="doc-edit">
            <a href={ghUrl} target="_blank" rel="noopener noreferrer">
              Edit this page on GitHub ↗
            </a>
            <a
              href="https://github.com/duydpdev/style-generator/issues/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              Report an issue ↗
            </a>
            <button
              type="button"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{
                background: "transparent",
                border: 0,
                color: "inherit",
                font: "inherit",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Back to top ↑
            </button>
          </div>
        </main>

        <DocsOnPage
          contentRef={contentRef}
          rawMarkdown={body}
          quicklinks={[{ label: "Edit on GitHub", href: ghUrl }]}
        />
      </div>
    </>
  );
}
