import type { JSX } from "react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Flex } from "../ui/flex";
import { Stack } from "../ui/stack";
import { Text } from "../ui/text";

import { DOCS_URL, REPO_URL } from "./content";
import { Section } from "./Section";

/** The hero: headline, lede and two calls to action. */
export function Hero(): JSX.Element {
  return (
    <Section id="hero">
      <Stack gap={6} align="start" className="max-w-3xl">
        <Badge variant="outline">Tailwind CSS v4</Badge>
        <Text as="h1" type="display56Serif" className="font-serif">
          Tokens in, a design system out.
        </Text>
        <Text type="text16Medium" color="muted">
          One theme.json becomes Tailwind utilities, typed tokens and a
          styleless kit for your own components.
        </Text>
        <Flex wrap gap={3}>
          <Button as="a" href={DOCS_URL}>
            Get started
          </Button>
          <Button as="a" href={REPO_URL} variant="outline">
            View on GitHub
          </Button>
        </Flex>
      </Stack>
    </Section>
  );
}
