import { useMemo } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { resolveDocLink } from "../lib/docs-content";

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeSlug, rehypeHighlight];

interface Props {
  source: string;
  /** Repo-relative path of the rendered file; relative links resolve against it. */
  repoPath: string;
}

/**
 * Markdown renderer for a doc page. Links to other rendered docs become router
 * links, other repo files point at GitHub, `#anchor` and absolute links are
 * left alone.
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
