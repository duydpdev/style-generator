<script setup lang="ts">
import Container from "./Container.vue";

import Box from "~/ui/box/Box.vue";
import Stack from "~/ui/stack/Stack.vue";

defineProps<{ id: "hero" | "features" | "pricing" | "cta" }>();
</script>

<!-- One landing section: `<section id>` with vertical rhythm and the page column. -->
<template>
  <Box as="section" :id="id" :py="20">
    <Container>
      <Stack :gap="10"><slot /></Stack>
    </Container>
  </Box>
</template>
