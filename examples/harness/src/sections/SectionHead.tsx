import type { ReactNode } from "react";

import { Box, Flex } from "../ui";

interface SectionHeadProps {
  num: string;
  title: ReactNode;
  desc: ReactNode;
}

export const SectionHead = ({ num, title, desc }: SectionHeadProps) => {
  return (
    <Flex wrap justify="between" mb={9} gap={6} className="x-section-head">
      <Box>
        <Box as="span" className="x-sg-section-num">
          {num}
        </Box>
        <Box as="h2" mt={2} className="x-sg-font-display x-section-title">
          {title}
        </Box>
      </Box>
      <Box as="p" className="x-section-desc">
        {desc}
      </Box>
    </Flex>
  );
};
