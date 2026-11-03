import type { JSX } from "react";

import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Stack } from "../ui/stack";
import { Text } from "../ui/text";

import { INSTALL_COMMAND, INSTALL_URL } from "./content";
import { Section } from "./Section";

/** The closing call to action: the install command and a link to the install guide. */
export function Cta(): JSX.Element {
  return (
    <Section id="cta">
      <Card padding="lg" shadow="lg" className="items-center text-center">
        <Text as="h2" type="text32Bold">
          Start from your own theme.json
        </Text>
        <Text type="text16Medium" color="muted">
          Add the package, run style-gen init, and import the generated CSS.
        </Text>
        <Stack gap={3} align="stretch" className="w-full max-w-3xl">
          <Input
            readOnly
            size="md"
            value={INSTALL_COMMAND}
            title={INSTALL_COMMAND}
            aria-label="Install command"
            className="font-mono"
          />
          <Button as="a" href={INSTALL_URL} size="md" className="self-center">
            Read the install guide
          </Button>
        </Stack>
      </Card>
    </Section>
  );
}
