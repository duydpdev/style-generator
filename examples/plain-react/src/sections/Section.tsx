import type { JSX, ReactNode } from "react";

import { Box } from "../ui/box";
import { Stack } from "../ui/stack";

export type SectionId = "hero" | "features" | "pricing" | "cta";

export interface ContainerProps {
  readonly children: ReactNode;
}

/** The page column: centred, max 64rem, side padding. */
export function Container({ children }: ContainerProps): JSX.Element {
  return (
    <Box className="mx-auto w-full max-w-5xl" px={6}>
      {children}
    </Box>
  );
}

export interface SectionProps {
  readonly id: SectionId;
  readonly children: ReactNode;
}

/** One landing section: `<section id>` with vertical rhythm and the page column. */
export function Section({ id, children }: SectionProps): JSX.Element {
  return (
    <Box as="section" id={id} py={20}>
      <Container>
        <Stack gap={10}>{children}</Stack>
      </Container>
    </Box>
  );
}
