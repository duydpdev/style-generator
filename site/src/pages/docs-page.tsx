import { useEffect, useRef } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";

import { DocMarkdown } from "../components/doc-markdown";
import { DocEdit, DocFooter } from "../components/docs-footer";
import { DocBreadcrumb, DocHead } from "../components/docs-header";
import { DocsMobileNav } from "../components/docs-mobile-nav";
import { DocsMobileOnPage } from "../components/docs-mobile-onpage";
import { DocsOnPage } from "../components/docs-onpage";
import { DocsSidebar } from "../components/docs-sidebar";
import { Topbar } from "../components/topbar";
import {
  adjacentDocs,
  docsOf,
  getDoc,
  REPO_BLOB_URL,
} from "../lib/docs-content";
import { approxReadMinutes, docBody } from "../lib/docs-body";
import { docPath, TOC_TITLES, UI_TEXT } from "../lib/locale";
import { useLocale } from "../lib/use-locale";
import { useTheme } from "../lib/use-theme";
import { Box, Grid } from "../ui";

import { NotFound } from "./not-found";

export function DocsPage() {
  const { slug } = useParams<{ slug?: string }>();
  const { hash } = useLocation();
  const { toggle } = useTheme();
  const contentRef = useRef<HTMLElement | null>(null);
  const locale = useLocale();

  // The document language follows the page; the rest of the site is English.
  useEffect(() => {
    document.documentElement.lang = locale;
    return () => {
      document.documentElement.lang = "en";
    };
  }, [locale]);

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

  // Tag the in-content "Table of contents" block so docs.css can restyle it to match
  // the landing-page TOC look. Match by heading text (resilient to rehype-slug
  // Unicode ID variations) and only apply when the next sibling is a <ul>.
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const raf = requestAnimationFrame(() => {
      const headings = root.querySelectorAll<HTMLHeadingElement>("h2");
      headings.forEach((h) => {
        const text = h.textContent.trim().toLowerCase();
        if (!TOC_TITLES.includes(text)) return;
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
    return (
      <Navigate
        to={docPath(locale, docsOf(locale)[0]?.slug ?? "introduction")}
        replace
      />
    );
  }

  const doc = getDoc(slug, locale);
  const { prev, next } = adjacentDocs(slug, locale);

  if (!doc) return <NotFound missingDoc={slug} />;

  const body = docBody(doc.source);
  const ghUrl = `${REPO_BLOB_URL}${doc.repoPath}`;

  return (
    <>
      <Topbar activeChapter={null} activeRoute="docs" onToggleTheme={toggle} />
      <Box className="s-container" maxWidth={1440} px={{ base: 5, lg: 8 }}>
        <Grid className="s-docs-shell" gap={14} position="relative">
          <DocsSidebar activeSlug={doc.slug} />

          <Box
            as="main"
            ref={contentRef}
            minWidth={0}
            maxWidth={720}
            pt={9}
            pb={30}
          >
            <DocsMobileNav activeSlug={doc.slug}>
              <DocsMobileOnPage contentRef={contentRef} rawMarkdown={body} />
            </DocsMobileNav>

            <DocBreadcrumb doc={doc} />
            <DocHead doc={doc} readMin={approxReadMinutes(body)} />

            <Box as="article" className="s-doc-body" data-testid="doc-body">
              <DocMarkdown source={body} repoPath={doc.repoPath} />
            </Box>

            <DocFooter prev={prev} next={next} />
            <DocEdit ghUrl={ghUrl} />
          </Box>

          <DocsOnPage
            contentRef={contentRef}
            rawMarkdown={body}
            quicklinks={[{ label: UI_TEXT[locale].editOnGitHub, href: ghUrl }]}
          />
        </Grid>
      </Box>
    </>
  );
}
