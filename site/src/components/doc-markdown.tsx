import { Children, cloneElement, isValidElement, useMemo } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { resolveDocLink } from "../lib/docs-content";

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeSlug, rehypeHighlight];

type AlertKind = "NOTE" | "TIP" | "IMPORTANT" | "WARNING" | "CAUTION";

interface AlertMeta {
  title: string;
  /** Existing `.callout` modifier class (`info`, `ok` or `warn`). */
  tone: "info" | "ok" | "warn";
  icon: string;
}

const ALERTS: Record<AlertKind, AlertMeta> = {
  NOTE: { title: "Note", tone: "info", icon: "i" },
  TIP: { title: "Tip", tone: "ok", icon: "✓" },
  IMPORTANT: { title: "Important", tone: "info", icon: "!" },
  WARNING: { title: "Warning", tone: "warn", icon: "!" },
  CAUTION: { title: "Caution", tone: "warn", icon: "!" },
};

const ALERT_MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\r?\n?/i;

function isAlertKind(value: string): value is AlertKind {
  return value in ALERTS;
}

interface ParsedAlert {
  kind: AlertKind;
  body: ReactNode[];
}

/**
 * GitHub alert syntax: a blockquote whose first paragraph starts with
 * `[!NOTE]` (or TIP / IMPORTANT / WARNING / CAUTION). Returns the alert kind
 * and the blockquote children with the marker removed, or `null` for a plain
 * blockquote.
 */
function parseAlert(children: ReactNode): ParsedAlert | null {
  const nodes = Children.toArray(children);
  const at = nodes.findIndex((n) => isValidElement(n));
  if (at < 0) return null;
  const para = nodes[at];
  if (!isValidElement<{ children?: ReactNode }>(para) || para.type !== "p") {
    return null;
  }
  const [head, ...tail] = Children.toArray(para.props.children);
  if (typeof head !== "string") return null;
  const match = ALERT_MARKER.exec(head);
  if (!match) return null;
  const kind = match[1].toUpperCase();
  if (!isAlertKind(kind)) return null;

  const rest = head.slice(match[0].length);
  const paraChildren = rest ? [rest, ...tail] : tail;
  const body =
    paraChildren.length > 0
      ? nodes.map((n, i) =>
          i === at ? cloneElement(para, {}, paraChildren) : n,
        )
      : nodes.filter((_, i) => i !== at);
  return { kind, body };
}

function isMermaidBlock(children: ReactNode): boolean {
  return Children.toArray(children).some(
    (child) =>
      isValidElement<{ className?: string }>(child) &&
      /(^|\s)language-mermaid(\s|$)/.test(child.props.className ?? ""),
  );
}

interface Props {
  source: string;
  /** Repo-relative path of the rendered file; relative links resolve against it. */
  repoPath: string;
}

/**
 * Markdown renderer for a doc page. Links to other rendered docs become router
 * links, other repo files point at GitHub, `#anchor` and absolute links are
 * left alone. Tables scroll inside a wrapper, GitHub alerts render as
 * callouts and mermaid fences are shown as labelled source (no diagram engine
 * is bundled).
 */
export function DocMarkdown({ source, repoPath }: Readonly<Props>) {
  const components = useMemo<Components>(
    () => ({
      // `node` (the hast element) must not reach the DOM, so pull it out of `rest`.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      a({ node: _node, href, children, ...rest }) {
        if (!href) return <a {...rest}>{children}</a>;
        const link = resolveDocLink(href, repoPath);
        if (link.kind === "internal") {
          return (
            <Link {...rest} to={link.to}>
              {children}
            </Link>
          );
        }
        if (link.kind === "repo") {
          return (
            <a {...rest} href={link.href} target="_blank" rel="noreferrer">
              {children}
            </a>
          );
        }
        return (
          <a {...rest} href={link.href}>
            {children}
          </a>
        );
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      table({ node: _node, ...rest }) {
        return (
          <div className="table-wrap">
            <table {...rest} />
          </div>
        );
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      blockquote({ node: _node, children, ...rest }) {
        const alert = parseAlert(children);
        if (!alert) return <blockquote {...rest}>{children}</blockquote>;
        const meta = ALERTS[alert.kind];
        return (
          <div className={`callout ${meta.tone}`} role="note">
            <span className="ico" aria-hidden="true">
              {meta.icon}
            </span>
            <div className="body">
              <p className="callout-title">{meta.title}</p>
              {alert.body}
            </div>
          </div>
        );
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      pre({ node: _node, children, ...rest }) {
        if (!isMermaidBlock(children)) {
          return <pre {...rest}>{children}</pre>;
        }
        return (
          <figure className="diagram-source">
            <figcaption>Diagram source (mermaid)</figcaption>
            <pre {...rest}>{children}</pre>
          </figure>
        );
      },
    }),
    [repoPath],
  );

  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={components}
    >
      {source}
    </ReactMarkdown>
  );
}
