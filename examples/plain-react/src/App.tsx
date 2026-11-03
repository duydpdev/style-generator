import type { JSX } from "react";

import { Box } from "./ui/box";
import { Button } from "./ui/button";
import { Flex } from "./ui/flex";
import { Grid } from "./ui/grid";
import { Stack } from "./ui/stack";
import { Text } from "./ui/text";

/** A smoke page: each component once. */
export function App(): JSX.Element {
  return (
    <Stack
      as="main"
      gap={6}
      p={8}
      minHeight="100vh"
      backgroundColor="background"
    >
      <Text as="h1" type="display56Serif">
        Plain React example
      </Text>
      <Box
        innerBorder
        borderColor="line"
        rounded="lg"
        p={6}
        backgroundColor="surface"
      >
        <Text color="muted">A Box with an inner border.</Text>
      </Box>
      <Flex gap={3} align="center" wrap>
        <Button>Fill</Button>
        <Button variant="outline" color="secondary">
          Outline
        </Button>
        <Button variant="soft" color="success" size="sm">
          Soft
        </Button>
        <Button variant="ghost" color="danger" size="lg">
          Ghost
        </Button>
      </Flex>
      <Grid columns={{ base: 1, md: 3 }} gap={4}>
        <Box p={4} rounded="md" border="thin" borderColor="line">
          <Text>One</Text>
        </Box>
        <Box p={4} rounded="md" border="thin" borderColor="line">
          <Text>Two</Text>
        </Box>
        <Box p={4} rounded="md" border="thin" borderColor="line">
          <Text>Three</Text>
        </Box>
      </Grid>
    </Stack>
  );
}
