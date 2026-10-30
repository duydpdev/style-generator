import { Link } from "react-router-dom";

import type { DocEntry } from "../lib/docs-content";
import { Box, Flex, Grid, Stack, Text } from "../ui";

interface CardProps {
  doc?: DocEntry;
  dir: "prev" | "next";
}

function NavCard({ doc, dir }: Readonly<CardProps>) {
  if (!doc) return <Box as="span" />;
  return (
    <Stack
      as={Link}
      to={`/docs/${doc.slug}`}
      data-part={dir === "next" ? "nav-card next" : "nav-card"}
      rounded="lg"
      px={5}
      py={4}
      gap={1}
    >
      <Text as="span" data-part="lbl" color="muted">
        {dir === "next" ? "Next →" : "← Previous"}
      </Text>
      <Text as="span" data-part="ttl">
        <em>{doc.title}</em>
      </Text>
    </Stack>
  );
}

interface FooterProps {
  prev?: DocEntry;
  next?: DocEntry;
}

/** Previous / next page cards. */
export function DocFooter({ prev, next }: Readonly<FooterProps>) {
  return (
    <Grid data-part="doc-footer" mt={16} gap={3.5}>
      <NavCard doc={prev} dir="prev" />
      <NavCard doc={next} dir="next" />
    </Grid>
  );
}

/** "Edit on GitHub" row under the page. */
export function DocEdit({ ghUrl }: Readonly<{ ghUrl: string }>) {
  return (
    <Flex data-part="doc-edit" wrap gap={4.5} mt={7}>
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
      <Box
        as="button"
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
      </Box>
    </Flex>
  );
}
