<script setup lang="ts">
import Container from "./Container.vue";
import { FOOTER_LINKS } from "./content";

import Box from "~/ui/box/Box.vue";
import Flex from "~/ui/flex/Flex.vue";
import Link from "~/ui/link/Link.vue";
import Text from "~/ui/text/Text.vue";
</script>

<!-- The page footer: licence line and three links. -->
<template>
  <Box as="footer" id="footer" borderT="thin" borderColor="line" :py="10">
    <Container>
      <Flex wrap align="center" justify="between" :gap="4">
        <Text type="text12Mono" color="muted"
          >@duydpdev/style-generator · MIT</Text
        >
        <Flex as="nav" aria-label="Footer" :gap="4">
          <Link
            v-for="link in FOOTER_LINKS"
            :key="link.label"
            :href="link.href"
            tone="muted"
          >
            {{ link.label }}
          </Link>
        </Flex>
      </Flex>
    </Container>
  </Box>
</template>
