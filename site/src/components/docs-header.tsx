import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import type { DocEntry } from "../lib/docs-content";
import { docPath, UI_TEXT } from "../lib/locale";
import { Box, Flex, Grid, Stack, Text } from "../ui";

interface Props {
  doc: DocEntry;
}

export function DocBreadcrumb({ doc }: Readonly<Props>) {
  const t = UI_TEXT[doc.locale];
  const other = doc.locale === "vi" ? "en" : "vi";
  return (
    <Flex className="s-doc-breadcrumb" align="center" gap={2} mb={6} wrap>
      <Link to={docPath(doc.locale)}>{t.docs}</Link>
      <Box as="span" className="s-sep">
        /
      </Box>
      <Box as="span">{t.groups[doc.group]}</Box>
      <Box as="span" className="s-sep">
        /
      </Box>
      <b>{doc.title}</b>
      <Box as="span" className="s-sep">
        ·
      </Box>
      <Link
        to={docPath(other, doc.slug)}
        hrefLang={other}
        lang={other}
        data-testid="doc-locale-switch"
      >
        {t.switchTo}
      </Link>
    </Flex>
  );
}

function MetaRow({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <Flex className="s-meta-row" align="center" gap={1.5}>
      <Box as="span">{label}</Box>
      {children}
    </Flex>
  );
}

export function DocHead({
  doc,
  readMin,
}: Readonly<Props & { readMin: number }>) {
  const t = UI_TEXT[doc.locale];
  return (
    <Grid as="header" className="s-doc-head" align="end" gap={6} pb={7} mb={9}>
      <Box>
        <Text as="h1" mb={5.5}>
          {doc.title} <em>{t.atAGlance}</em>
        </Text>
        <Text as="p" className="s-doc-lede" color="muted">
          <b>{doc.title}</b> {t.syncedFrom} <code>{doc.repoPath}</code>
          {t.lockstep}
        </Text>
      </Box>
      <Stack className="s-doc-meta" gap={1.5} align="end">
        <Flex className="s-meta-row" align="center" gap={1.5}>
          <Box
            as="span"
            className="s-pulse"
            width={6}
            height={6}
            backgroundColor="success"
          />
          <Box as="span">{t.upToDate}</Box>
        </Flex>
        <MetaRow label={t.fileLabel}>
          <code>{doc.repoPath}</code>
        </MetaRow>
        <MetaRow label={t.groupLabel}>
          <Box as="span">{t.groups[doc.group]}</Box>
        </MetaRow>
        <MetaRow label={t.readLabel}>
          <Box as="span">{t.minutes(readMin)}</Box>
        </MetaRow>
      </Stack>
    </Grid>
  );
}
