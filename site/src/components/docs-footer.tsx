import { Link } from "react-router-dom";

import type { DocEntry } from "../lib/docs-content";
import { docPath, UI_TEXT } from "../lib/locale";
import { useLocale } from "../lib/use-locale";
import { Box, Flex, Grid, Stack, Text } from "../ui";

interface CardProps {
  doc?: DocEntry;
  dir: "prev" | "next";
}

function NavCard({ doc, dir }: Readonly<CardProps>) {
  if (!doc) return <Box as="span" />;
  const t = UI_TEXT[doc.locale];
  return (
    <Stack
      as={Link}
      to={docPath(doc.locale, doc.slug)}
      className={dir === "next" ? "s-nav-card s-next" : "s-nav-card"}
      rounded="lg"
      px={5}
      py={4}
      gap={1}
    >
      <Text as="span" className="s-lbl" color="muted">
        {dir === "next" ? t.next : t.previous}
      </Text>
      <Text as="span" className="s-ttl">
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
    <Grid className="s-doc-footer" mt={16} gap={3.5}>
      <NavCard doc={prev} dir="prev" />
      <NavCard doc={next} dir="next" />
    </Grid>
  );
}

/** "Edit on GitHub" row under the page. */
export function DocEdit({ ghUrl }: Readonly<{ ghUrl: string }>) {
  const t = UI_TEXT[useLocale()];
  return (
    <Flex className="s-doc-edit" wrap gap={4.5} mt={7}>
      <a href={ghUrl} target="_blank" rel="noopener noreferrer">
        {t.editPage}
      </a>
      <a
        href="https://github.com/duydpdev/style-generator/issues/new"
        target="_blank"
        rel="noopener noreferrer"
      >
        {t.reportIssue}
      </a>
      <Box
        as="button"
        type="button"
        onClick={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className="s-back-to-top"
      >
        {t.backToTop}
      </Box>
    </Flex>
  );
}
