<!--
  Type test for the plain components, checked by `nuxt typecheck` (vue-tsc):
  .nuxt/tsconfig.app.json includes tests/nuxt/**. Every expect-error
  directive must be consumed, every other line must compile. Never rendered.
-->
<script setup lang="ts">
import Box from "~/ui/box/Box.vue";
import Button from "~/ui/button/Button.vue";
import Text from "~/ui/text/Text.vue";
</script>

<template>
  <Box
    :p="4"
    :gapX="{ base: 1, md: 3 }"
    backgroundColor="surface"
    class="w-full"
  >
    <Text type="text14Regular" color="muted">ok</Text>
    <Button variant="outline" size="sm">Go</Button>
    <Text
      transform="uppercase"
      italic
      truncate
      :lineClamp="3"
      wrap="balance"
      color="primary/50"
    >
      x
    </Text>
    <!-- @vue-expect-error xl is not a configured breakpoint -->
    <Box :p="{ xl: 4 }" />
    <!-- @vue-expect-error unknown color token -->
    <Text color="nope">x</Text>
    <!-- @vue-expect-error unknown transform -->
    <Text transform="bold">x</Text>
    <!-- @vue-expect-error step not declared -->
    <Text color="primary/55">x</Text>
    <!-- @vue-expect-error unknown button variant -->
    <Button variant="huge">x</Button>
  </Box>
</template>
