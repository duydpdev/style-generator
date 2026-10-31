import { useMemo } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";

import { ALERTS, isMermaidBlock, parseAlert } from "../lib/doc-alerts";
import { resolveDocLink } from "../lib/docs-content";
import { Box, Grid, Text } from "../ui";

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
          <Box data-part="table-wrap" maxWidth="100%" mb={7} rounded="lg">
            <table {...rest} />
          </Box>
        );
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      blockquote({ node: _node, children, ...rest }) {
        const alert = parseAlert(children);
        if (!alert) return <blockquote {...rest}>{children}</blockquote>;
        const meta = ALERTS[alert.kind];
        return (
          <Grid
            data-part={meta.part}
            role="note"
            gap={3.5}
            px={5}
            py={4}
            my={6}
            rounded="lg"
          >
            <Box
              as="span"
              data-part="ico"
              width={24}
              height={24}
              aria-hidden="true"
            >
              {meta.icon}
            </Box>
            <Box data-part="callout-body" minWidth={0}>
              <Text
                as="div"
                data-part="callout-title"
                color="foreground"
                mb={1}
              >
                {meta.title}
              </Text>
              {alert.body}
            </Box>
          </Grid>
        );
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      pre({ node: _node, children, ...rest }) {
        if (!isMermaidBlock(children)) {
          return <pre {...rest}>{children}</pre>;
        }
        return (
          <Box as="figure" data-part="diagram-source" minWidth={0} mb={6}>
            <figcaption>Diagram source (mermaid)</figcaption>
            <pre {...rest}>{children}</pre>
          </Box>
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
