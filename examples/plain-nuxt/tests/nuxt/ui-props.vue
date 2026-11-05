<!--
  Type test for the plain components, checked by `nuxt typecheck` (vue-tsc):
  .nuxt/tsconfig.app.json includes tests/nuxt/**. Every expect-error
  directive must be consumed, every other line must compile. Never rendered.
-->
<script setup lang="ts">
import Box from "~/ui/box/Box.vue";
import Button from "~/ui/button/Button.vue";
import Flex from "~/ui/flex/Flex.vue";
import Grid from "~/ui/grid/Grid.vue";
import Input from "~/ui/input/Input.vue";
import Stack from "~/ui/stack/Stack.vue";
import Text from "~/ui/text/Text.vue";

// Stack's props exclude the Flex-only item props (D5). vue-tsc without
// checkUnknownProps accepts an unknown prop in a template as a fallthrough
// attribute, so the negative lives on the props type instead.
/* eslint-disable sonarjs/void-use -- type-level checks, never executed */
type StackProps = InstanceType<typeof Stack>["$props"];
void ({ direction: "row", divideColor: "line" } satisfies StackProps);
// @ts-expect-error Stack has no grow
void ({ grow: true } satisfies StackProps);
/* eslint-enable sonarjs/void-use */
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
    <Box
      display="inlineFlex"
      overflow="hidden"
      :zIndex="10"
      :opacity="50"
      cursor="pointer"
      visibility="collapse"
      ringColor="primary"
      outlineColor="primary/10"
      backgroundColor="primary/10"
    />
    <Flex :zIndex="10" ringColor="primary/10" />
    <Grid :opacity="50" outlineColor="primary/10" />
    <Stack overflow="hidden" backgroundColor="primary/10" />
    <!-- @vue-expect-error not a z-index step -->
    <Box :zIndex="11" />
    <!-- @vue-expect-error not an opacity step -->
    <Box :opacity="55" />
    <!-- @vue-expect-error 55 is not a declared step -->
    <Box backgroundColor="primary/55" />
    <Flex grow :shrink="false" basis="1/2" divideColor="line" />
    <Stack divideColor="primary/10" />
    <!-- @vue-expect-error not a basis -->
    <Flex basis="1/5" />
    <Grid :columns="2" :rows="3" />
    <!-- @vue-expect-error rows is 1-6 or none -->
    <Grid :columns="2" :rows="7" />
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
    <Input placeholderColor="primary/10" aria-label="x" />
    <!-- @vue-expect-error unknown color token -->
    <Input placeholderColor="nope" aria-label="x" />
  </Box>
</template>
