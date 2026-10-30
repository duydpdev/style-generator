import type { ReactNode } from "react";

import { Box, Flex, Grid, Text } from "../ui";

interface Props {
  badge: string;
  title: ReactNode;
  body: ReactNode;
}

/**
 *
 * @param root0
 * @param root0.badge
 * @param root0.title
 * @param root0.body
 */
export function KeyPoint({ badge, title, body }: Readonly<Props>) {
  return (
    <Grid data-part="kp" gap={3} px={3.5} py={3} rounded="lg">
      <Flex
        as="span"
        data-part="kp-badge"
        align="center"
        justify="center"
        width={28}
        height={28}
        backgroundColor="primarySoft"
      >
        {badge}
      </Flex>
      <Box>
        <Box as="h5" mb={0.75}>
          {title}
        </Box>
        <Text as="p" color="muted">
          {body}
        </Text>
      </Box>
    </Grid>
  );
}
