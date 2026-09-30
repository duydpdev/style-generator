import type { ReactNode } from "react";

import { Box } from "../components/Box";

interface SectionHeadProps {
  num: string;
  title: ReactNode;
  desc: ReactNode;
}

export const SectionHead = ({ num, title, desc }: SectionHeadProps) => {
  return (
    <Box className="mb-9 flex flex-wrap items-baseline justify-between gap-6">
      <Box>
        <span className="sg-section-num">{num}</span>
        <h2
          className="sg-font-display m-0 mt-2 tracking-[-0.02em] text-[40px] leading-tight"
          style={{ color: "var(--color-foreground)" }}
        >
          {title}
        </h2>
      </Box>
      <p
        className="m-0 max-w-[44ch] text-[14px]"
        style={{ color: "var(--color-muted)" }}
      >
        {desc}
      </p>
    </Box>
  );
};
