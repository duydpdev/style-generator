import type { JSX } from "react";

import { Box } from "../ui/box";
import { Flex } from "../ui/flex";
import { Link } from "../ui/link";
import { Text } from "../ui/text";

import { FOOTER_LINKS } from "./content";
import { Container } from "./Section";

/** The page footer: licence line and three links. */
export function Footer(): JSX.Element {
  return (
    <Box as="footer" id="footer" borderT="thin" borderColor="line" py={10}>
      <Container>
        <Flex wrap align="center" justify="between" gap={4}>
          <Text type="text12Mono" color="muted">
            @duydpdev/style-generator · MIT
          </Text>
          <Flex as="nav" aria-label="Footer" gap={4}>
            {FOOTER_LINKS.map((link) => (
              <Link key={link.label} href={link.href} tone="muted">
                {link.label}
              </Link>
            ))}
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
}
