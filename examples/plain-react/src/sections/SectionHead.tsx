import type { JSX } from "react";

import { Stack } from "../ui/stack";
import { Text } from "../ui/text";

export interface SectionHeadProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly lede: string;
}

/** Eyebrow, title and lede of a section. */
export function SectionHead({
  eyebrow,
  title,
  lede,
}: SectionHeadProps): JSX.Element {
  return (
    <Stack gap={3} className="max-w-2xl">
      <Text as="span" type="text12Mono" color="primary" className="uppercase">
        {eyebrow}
      </Text>
      <Text as="h2" type="text32Bold">
        {title}
      </Text>
      <Text type="text16Medium" color="muted">
        {lede}
      </Text>
    </Stack>
  );
}
