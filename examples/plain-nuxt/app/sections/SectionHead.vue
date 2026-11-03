<script setup lang="ts">
import Stack from "~/ui/stack/Stack.vue";
import Text from "~/ui/text/Text.vue";

defineProps<{ eyebrow: string; title: string; lede: string }>();
</script>

<!-- Eyebrow, title and lede of a section. -->
<template>
  <Stack :gap="3" class="max-w-2xl">
    <Text as="span" type="text12Mono" color="primary" class="uppercase">
      {{ eyebrow }}
    </Text>
    <Text as="h2" type="text32Bold">{{ title }}</Text>
    <Text type="text16Medium" color="muted">{{ lede }}</Text>
  </Stack>
</template>
