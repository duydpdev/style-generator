import { useMemo } from "react";

import { tokenize, type Lang } from "../lib/tokenize";
import { Box, Flex, Stack, Text } from "../ui";

interface Props {
  filename: string;
  tag?: string;
  lang: Lang;
  code: string;
}

/**
 *
 * @param root0
 * @param root0.filename
 * @param root0.tag
 * @param root0.lang
 * @param root0.code
 */
export function CodeCard({ filename, tag, lang, code }: Readonly<Props>) {
  const html = useMemo(() => tokenize(code, lang), [code, lang]);

  return (
    <Stack data-part="code-card" rounded="lg">
      <Flex data-part="code-head" align="center" gap={2} px={4} py={3}>
        <Flex as="span" gap={1.25}>
          <Box as="span" data-part="dot" width={10} height={10} />
          <Box as="span" data-part="dot" width={10} height={10} />
          <Box as="span" data-part="dot" width={10} height={10} />
        </Flex>
        <Text as="span" data-part="filename" ml={1.5}>
          {filename}
        </Text>
        {tag ? (
          <Box as="span" data-part="tag" rounded="pill" px={1.75} py={0.5}>
            {tag}
          </Box>
        ) : null}
      </Flex>
      <Box data-part="code-body" px={5.5} py={4.5}>
        <pre dangerouslySetInnerHTML={{ __html: html }} />
      </Box>
    </Stack>
  );
}
