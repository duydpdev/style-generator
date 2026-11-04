import { Box, Flex } from "../ui";

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
      className="s-frame-titlebar"
      height={38}
      align="center"
      gap={3}
      px={3.5}
    >
      <Flex className="s-traffic" gap={1.5}>
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
      <Flex
        className="s-url-pill s-container"
        align="center"
        rounded="pill"
        backgroundColor="bg"
        height={24}
        maxWidth={480}
        minWidth={0}
        gap={2}
        px={3}
      >
        <Lock />
        <Box as="span" className="s-url-host">
          localhost:5174
        </Box>
        <Box as="span" className="s-url-path">
          {pathLabel}
        </Box>
      </Flex>
      <Box className="s-frame-meta">{meta}</Box>
    </Flex>
  );
}
