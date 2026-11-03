<script setup lang="ts">
import { DOCS_URL, REPO_URL } from "./content";
import Section from "./Section.vue";

import Badge from "~/ui/badge/Badge.vue";
import Button from "~/ui/button/Button.vue";
import Flex from "~/ui/flex/Flex.vue";
import Stack from "~/ui/stack/Stack.vue";
import Text from "~/ui/text/Text.vue";
</script>

<!-- The hero: headline, lede and two calls to action. -->
<template>
  <Section id="hero">
    <Stack :gap="6" align="start" class="max-w-3xl">
      <Badge variant="outline">Tailwind CSS v4</Badge>
      <Text as="h1" type="display56Serif" class="font-serif">
        Tokens in, a design system out.
      </Text>
      <Text type="text16Medium" color="muted">
        One theme.json becomes Tailwind utilities, typed tokens and a styleless
        kit for your own components.
      </Text>
      <Flex wrap :gap="3">
        <Button as="a" :href="DOCS_URL">Get started</Button>
        <Button as="a" :href="REPO_URL" variant="outline"
          >View on GitHub</Button
        >
      </Flex>
    </Stack>
  </Section>
</template>
