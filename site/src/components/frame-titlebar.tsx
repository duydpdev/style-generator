import { Box, Container, Flex } from "../ui";

import { Lock } from "./icon";

interface Props {
  pathLabel: string;
  meta: string;
}

/**
 * Browser-like title bar above the example preview.
 * @param root0 - Component props
 * @param root0.pathLabel - Path shown in the address pill
 * @param root0.meta - Text on the right of the bar
 */
export function FrameTitlebar({ pathLabel, meta }: Readonly<Props>) {
  return (
    <Flex
      data-part="frame-titlebar"
      height={38}
      align="center"
      gap={3}
      px={3.5}
    >
      <Flex data-part="traffic" gap={1.5}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            as="span"
            width={11}
            height={11}
            backgroundColor="lineStronger"
          />
        ))}
      </Flex>
      <Container
        data-part="url-pill"
        rounded="pill"
        backgroundColor="bg"
        height={24}
        maxWidth={480}
        minWidth={0}
        gap={2}
        px={3}
      >
        <Lock />
        <Box as="span" data-part="url-host">
          localhost:5174
        </Box>
        <Box as="span" data-part="url-path">
          {pathLabel}
        </Box>
      </Container>
      <Box data-part="frame-meta">{meta}</Box>
    </Flex>
  );
}
