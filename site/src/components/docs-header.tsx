import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import type { DocEntry } from "../lib/docs-content";
import { Box, Flex, Grid, Stack, Text } from "../ui";

interface Props {
  doc: DocEntry;
}

export function DocBreadcrumb({ doc }: Readonly<Props>) {
  return (
    <Flex data-part="doc-breadcrumb" align="center" gap={2} mb={6}>
      <Link to="/docs">Docs</Link>
      <Box as="span" data-part="sep">
        /
      </Box>
      <Box as="span">{doc.group}</Box>
      <Box as="span" data-part="sep">
        /
      </Box>
      <b>{doc.title}</b>
    </Flex>
  );
}

function MetaRow({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <Flex data-part="meta-row" align="center" gap={1.5}>
      <Box as="span">{label}</Box>
      {children}
    </Flex>
  );
}

export function DocHead({
  doc,
  readMin,
}: Readonly<Props & { readMin: number }>) {
  return (
    <Grid as="header" data-part="doc-head" align="end" gap={6} pb={7} mb={9}>
      <Box>
        <Text as="h1" mb={5.5}>
          {doc.title} <em>at a glance.</em>
        </Text>
        <Text as="p" data-part="doc-lede" color="muted">
          <b>{doc.title}</b> — synced from <code>{doc.repoPath}</code>. All
          artifacts stay in lockstep with the source.
        </Text>
      </Box>
      <Stack data-part="doc-meta" gap={1.5} align="end">
        <Flex data-part="meta-row" align="center" gap={1.5}>
          <Box
            as="span"
            data-part="pulse"
            width={6}
            height={6}
            backgroundColor="success"
          />
          <Box as="span">up to date</Box>
        </Flex>
        <MetaRow label="FILE">
          <code>{doc.repoPath}</code>
        </MetaRow>
        <MetaRow label="GROUP">
          <Box as="span">{doc.group}</Box>
        </MetaRow>
        <MetaRow label="READ">
          <Box as="span">~{readMin} min</Box>
        </MetaRow>
      </Stack>
    </Grid>
  );
}
