<!--
  Type test for the sample components, checked by `nuxt typecheck` (vue-tsc):
  .nuxt/tsconfig.app.json includes tests/nuxt/**. Every expect-error
  directive must be consumed, every other line must compile. Never rendered.
-->
<script setup lang="ts">
import Box from "~/ui/Box.vue";
import Button from "~/ui/Button.vue";
import Flex from "~/ui/Flex.vue";
import Grid from "~/ui/Grid.vue";
import Stack from "~/ui/Stack.vue";
import Text from "~/ui/Text.vue";

const onClick = (event: MouseEvent) => event.detail;
</script>

<template>
  <Stack as="main" align="center" :py="{ base: 6, md: 10 }" :px="4">
    <Box
      backgroundColor="surface"
      borderColor="line"
      border="thin"
      rounded="lg"
      innerBorder
      width="100%"
      :maxWidth="960"
      :p="8"
    >
      <Text as="h1" type="display56Serif" color="muted" :mt="2">Title</Text>
      <Flex wrap justify="between" :gap="2" :gapX="{ base: 1, md: 3 }">
        <Button variant="outline" color="danger" size="sm" @click="onClick">
          <template #prefix>i</template>
          Go
          <template #suffix>j</template>
        </Button>
      </Flex>
      <Grid :columns="3"><Text>a</Text></Grid>
      <Grid :columns="{ base: 1, md: 3 }" :gap="3"><Text>b</Text></Grid>
      <Grid columns="80px 1fr"><Text>c</Text></Grid>
      <Grid :columns="{ base: 1, md: '220px 1fr' }"><Text>d</Text></Grid>
      <!-- @vue-expect-error p takes a number or a { base, md, lg } object -->
      <Box :p="'4'" />
      <!-- @vue-expect-error xl is not a configured breakpoint -->
      <Box :p="{ xl: 4 }" />
      <!-- @vue-expect-error unknown color token -->
      <Text color="nope">x</Text>
      <!-- @vue-expect-error unknown button variant -->
      <Button variant="huge">x</Button>
      <!-- @vue-expect-error columns breakpoint must be configured -->
      <Grid :columns="{ xl: 2 }" />
      <!-- @vue-expect-error Stack direction is row | column -->
      <Stack direction="diagonal" />
    </Box>
  </Stack>
</template>
