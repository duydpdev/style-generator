import { useMemo } from "react";

import type { ExampleFile } from "../lib/example-files";
import { tokenize } from "../lib/tokenize";
import { Box, Flex, Stack, Text } from "../ui";

import { CodeStatusbar } from "./code-statusbar";
import { CodeTabs } from "./code-tabs";

interface Props {
  openTabs: ExampleFile[];
  activePath: string | null;
  onPick: (path: string) => void;
  onClose: (path: string) => void;
}

/**
 * Read-only code viewer: tab strip, line numbers, highlighted source, status bar.
 * @param root0 - Component props
 * @param root0.openTabs - Files with an open tab
 * @param root0.activePath - Path of the file shown
 * @param root0.onPick - Activates a tab
 * @param root0.onClose - Closes a tab
 */
export function CodeEditor({
  openTabs,
  activePath,
  onPick,
  onClose,
}: Readonly<Props>) {
  const active = openTabs.find((f) => f.path === activePath) ?? null;

  const html = useMemo(
    () => (active ? tokenize(active.code, active.lang) : ""),
    [active],
  );

  const lineCount = active ? active.code.split("\n").length : 0;
  const gutter = useMemo(
    () =>
      Array.from({ length: lineCount }, (_, i) => i + 1)
        .map((n) => String(n))
        .join("\n"),
    [lineCount],
  );

  return (
    <Stack data-part="code-pane">
      <CodeTabs
        openTabs={openTabs}
        activePath={activePath}
        onPick={onPick}
        onClose={onClose}
      />

      {active ? (
        <Box data-part="code-body-wrap" position="relative" minHeight={0}>
          <Flex minWidth="100%" width="max-content" minHeight="100%">
            <Box
              as="pre"
              data-part="code-gutter"
              width={56}
              py={4}
              pr={3}
              aria-hidden="true"
            >
              {gutter}
            </Box>
            <Text
              as="pre"
              data-part="code-source"
              py={4}
              px={5.5}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </Flex>
        </Box>
      ) : (
        <Flex data-part="code-empty" align="center" justify="center" p={6}>
          Pick a file from the sidebar to start reading code.
        </Flex>
      )}

      <CodeStatusbar
        path={active?.path}
        lang={active?.lang}
        lineCount={lineCount}
      />
    </Stack>
  );
}
