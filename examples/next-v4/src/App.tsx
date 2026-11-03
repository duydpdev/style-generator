import type { JSX } from "react";

import { Cta } from "./sections/Cta";
import { DOCS_URL } from "./sections/content";
import { Features } from "./sections/Features";
import { Footer } from "./sections/Footer";
import { Hero } from "./sections/Hero";
import { Pricing } from "./sections/Pricing";
import { Container } from "./sections/Section";
import { ThemeSwitch } from "./ThemeSwitch";
import { Box } from "./ui/box";
import { Flex } from "./ui/flex";
import { Link } from "./ui/link";
import { Text } from "./ui/text";

/** The landing page: header, four sections, footer. */
export function App(): JSX.Element {
  return (
    <Box backgroundColor="background" className="min-h-screen text-foreground">
      <Box
        as="header"
        position="sticky"
        backdropBlur="md"
        borderB="thin"
        borderColor="line"
        className="top-0 z-10 bg-background/80"
      >
        <Container>
          <Flex align="center" justify="between" gap={4} py={4}>
            <Link href="#hero" tone="foreground" underline="none">
              <Text as="span" type="text16Medium">
                style-generator
              </Text>
            </Link>
            <Flex as="nav" aria-label="Main" align="center" gap={4}>
              <Link href="#features" tone="muted">
                Features
              </Link>
              <Link href="#pricing" tone="muted">
                Pricing
              </Link>
              <Link href={DOCS_URL} tone="muted">
                Docs
              </Link>
              <ThemeSwitch />
            </Flex>
          </Flex>
        </Container>
      </Box>
      <main>
        <Hero />
        <Features />
        <Pricing />
        <Cta />
      </main>
      <Footer />
    </Box>
  );
}
