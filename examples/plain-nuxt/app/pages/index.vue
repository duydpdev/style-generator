<script setup lang="ts">
import ThemeSwitch from "~/components/ThemeSwitch.vue";
import Cta from "~/sections/Cta.vue";
import { DOCS_URL } from "~/sections/content";
import Container from "~/sections/Container.vue";
import Features from "~/sections/Features.vue";
import Footer from "~/sections/Footer.vue";
import Hero from "~/sections/Hero.vue";
import Pricing from "~/sections/Pricing.vue";
import Box from "~/ui/box/Box.vue";
import Flex from "~/ui/flex/Flex.vue";
import Link from "~/ui/link/Link.vue";
import Text from "~/ui/text/Text.vue";
</script>

<!-- #region docs:usage -->
<template>
  <Box backgroundColor="background" class="min-h-screen text-foreground">
    <Box
      as="header"
      position="sticky"
      backdropBlur="md"
      borderB="thin"
      borderColor="line"
      class="top-0 z-10 bg-background/80"
    >
      <Container>
        <Flex align="center" justify="between" :gap="4" :py="4">
          <Link href="#hero" tone="foreground" underline="none">
            <Text as="span" type="text16Medium">style-generator</Text>
          </Link>
          <Flex as="nav" aria-label="Main" align="center" :gap="4">
            <Link href="#features" tone="muted">Features</Link>
            <Link href="#pricing" tone="muted">Pricing</Link>
            <Link :href="DOCS_URL" tone="muted">Docs</Link>
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
</template>
<!-- #endregion docs:usage -->
