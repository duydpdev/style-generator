import type { ReactNode } from "react";

import { Box, Flex } from "../ui";

interface SectionHeadProps {
  num: string;
  title: ReactNode;
  desc: ReactNode;
}

export const SectionHead = ({ num, title, desc }: SectionHeadProps) => {
  return (
    <Flex wrap justify="between" mb={9} gap={6} data-part="section-head">
      <Box>
        <Box as="span" data-part="sg-section-num">
          {num}
        </Box>
        <Box
          as="h2"
          mt={2}
          data-part="sg-font-display section-title"
          style={{ color: "var(--color-foreground)" }}
        >
          {title}
        </Box>
      </Box>
      <Box
        as="p"
        data-part="section-desc"
        style={{ color: "var(--color-muted)" }}
      >
        {desc}
      </Box>
    </Flex>
  );
};
