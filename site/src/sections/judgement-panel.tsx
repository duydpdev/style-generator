import type { ReactNode } from "react";

import { Box, Flex, Grid, Stack, Text } from "../ui";

export interface JudgementItem {
  title: string;
  meta: string;
}

interface Props {
  /** `data-part` modifier token: `pro` or `con`. */
  part: string;
  /** Soft tint of the tag and the marks. */
  tint: "successSoft" | "dangerSoft";
  tag: string;
  heading: string;
  items: readonly JudgementItem[];
  icon: ReactNode;
}

/**
 * One column of the strengths / friction pair.
 * @param root0
 * @param root0.part
 * @param root0.tint
 * @param root0.tag
 * @param root0.heading
 * @param root0.items
 * @param root0.icon
 */
export function JudgementPanel({
  part,
  tint,
  tag,
  heading,
  items,
  icon,
}: Readonly<Props>) {
  return (
    <Box data-part={`judgement ${part}`} rounded="lg" p={6}>
      <Flex data-part="judgement-head" align="center" gap={2.5} mb={4} pb={3.5}>
        <Box
          as="span"
          data-part="j-tag"
          rounded="pill"
          px={2.25}
          py={0.75}
          backgroundColor={tint}
        >
          {tag}
        </Box>
        <Text as="h3" data-part="j-head-title">
          {heading}
        </Text>
      </Flex>
      <Stack as="ul" gap={3}>
        {items.map((it) => (
          <Grid as="li" key={it.title} data-part="j-item" gap={2.5}>
            <Flex
              as="span"
              data-part="mark"
              align="center"
              justify="center"
              width={22}
              height={22}
              mt={0.25}
              backgroundColor={tint}
            >
              {icon}
            </Flex>
            <Box>
              <b>{it.title}</b>
              <Text as="span" data-part="meta" color="muted" mt={0.5}>
                {it.meta}
              </Text>
            </Box>
          </Grid>
        ))}
      </Stack>
    </Box>
  );
}
