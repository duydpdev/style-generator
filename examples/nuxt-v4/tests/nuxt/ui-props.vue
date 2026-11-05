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

// Stack's props are Omit<FlexProps, "grow" | "shrink" | "basis"> (D5). vue-tsc
// without checkUnknownProps accepts an unknown prop in a template as a
// fallthrough attribute, so the negative lives on the props type instead.
/* eslint-disable sonarjs/void-use -- type-level checks, never executed */
type StackProps = InstanceType<typeof Stack>["$props"];
void ({ direction: "row", divideColor: "line" } satisfies StackProps);
// @ts-expect-error Stack has no grow
void ({ grow: true } satisfies StackProps);
/* eslint-enable sonarjs/void-use */
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
      <Flex grow :shrink="false" basis="1/2" divideColor="line" />
      <Stack divideColor="primary/10" />
      <!-- @vue-expect-error not a basis -->
      <Flex basis="1/5" />
      <Grid :columns="3"><Text>a</Text></Grid>
      <Grid :columns="{ base: 1, md: 3 }" :gap="3"><Text>b</Text></Grid>
      <Grid columns="80px 1fr"><Text>c</Text></Grid>
      <Grid :columns="{ base: 1, md: '220px 1fr' }"><Text>d</Text></Grid>
      <Grid :columns="2" :rows="3" />
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
        cursor="notAllowed"
        pointerEvents="none"
        select="all"
        transition="colors"
        aspect="video"
        objectFit="scaleDown"
        visibility="collapse"
        ringColor="primary"
        outlineColor="primary/10"
        backgroundColor="primary/10"
      />
      <!-- @vue-expect-error 11 is not a z-index step -->
      <Box :zIndex="11" />
      <!-- @vue-expect-error 55 is not an opacity step -->
      <Box :opacity="55" />
      <!-- @vue-expect-error step not declared -->
      <Box backgroundColor="primary/55" />
      <!-- @vue-expect-error p takes a number or a { base, md, lg } object -->
      <Box :p="'4'" />
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
      <!-- @vue-expect-error columns breakpoint must be configured -->
      <Grid :columns="{ xl: 2 }" />
      <!-- @vue-expect-error rows is 1-6 or none -->
      <Grid :columns="2" :rows="7" />
      <!-- @vue-expect-error Stack direction is row | column -->
      <Stack direction="diagonal" />
    </Box>
  </Stack>
</template>
