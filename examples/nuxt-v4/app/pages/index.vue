<script setup lang="ts">
import { intents } from "design-system-example";

import ThemeSwitch from "~/components/ThemeSwitch.vue";
import Box from "~/ui/Box.vue";
import Button from "~/ui/Button.vue";
import Flex from "~/ui/Flex.vue";
import Grid from "~/ui/Grid.vue";
import Stack from "~/ui/Stack.vue";
import Text from "~/ui/Text.vue";

const BUTTON_VARIANTS = ["fill", "outline", "soft", "ghost", "link"] as const;
const CELLS = ["Box", "Stack", "Flex"] as const;
</script>

<!-- #region docs:usage -->
<template>
  <Stack as="main" align="center" :py="{ base: 6, md: 10 }" :px="4">
    <Stack width="100%" :maxWidth="960" :gap="6">
      <Flex as="header" justify="between" align="end" wrap :gap="4">
        <Box>
          <Text type="text12Mono" color="muted">
            @duydpdev/style-generator · Nuxt 4
          </Text>
          <Text as="h1" type="display56Serif">Shared design system</Text>
        </Box>
        <ThemeSwitch />
      </Flex>

      <Box
        as="section"
        backgroundColor="surface"
        borderColor="line"
        border="thin"
        rounded="lg"
        shadow="sm"
        :p="8"
      >
        <Stack :gap="{ base: 2, md: 4 }">
          <Text as="h2" type="text20Semibold">Buttons</Text>
          <Flex
            v-for="color in intents"
            :key="color"
            wrap
            align="center"
            :gap="2"
          >
            <Text as="span" type="text12Mono" :color="color">{{ color }}</Text>
            <Button
              v-for="variant in BUTTON_VARIANTS"
              :key="variant"
              :variant="variant"
              :color="color"
            >
              {{ variant }}
            </Button>
          </Flex>
        </Stack>
      </Box>

      <Box as="section" borderColor="line" border="thin" rounded="lg" :p="5">
        <Stack :gap="3">
          <Text as="h2" type="text20Semibold">Layout</Text>
          <Grid :columns="{ base: 1, md: 3 }" :gap="3">
            <Box
              v-for="name in CELLS"
              :key="name"
              backgroundColor="background"
              borderColor="line"
              border="thin"
              rounded="md"
              :p="4"
            >
              <Text type="text14Regular">{{ name }}</Text>
            </Box>
          </Grid>
        </Stack>
      </Box>
    </Stack>
  </Stack>
</template>
<!-- #endregion docs:usage -->
