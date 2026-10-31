<script setup lang="ts">
import { intents } from "design-system-example";
import { ref } from "vue";

import ThemeSwitch from "~/components/ThemeSwitch.vue";
import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Dialog,
  Flex,
  Input,
  Stack,
  Text,
} from "~/ui";

const BUTTON_VARIANTS = ["fill", "outline", "soft", "ghost", "link"] as const;

const dialogOpen = ref(false);
</script>

<!-- #region docs:usage -->
<template>
  <Container as="main" :maxWidth="960" :py="{ base: 6, md: 10 }" :px="4">
    <Stack as="header" justify="between" wrap>
      <Box>
        <Text type="text12Mono" color="muted">
          @duydpdev/style-generator · Nuxt 4
        </Text>
        <Text as="h1" type="display56Serif">Shared design system</Text>
      </Box>
      <ThemeSwitch />
    </Stack>

    <Card as="section" tone="surface" padding="lg">
      <Stack :gap="{ base: 2, md: 4 }">
        <Text as="h2" type="text20Semibold">Buttons</Text>
        <Flex v-for="color in intents" :key="color" wrap :gap="2">
          <Badge :color="color">{{ color }}</Badge>
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
    </Card>

    <Card as="section" tone="outline" padding="md">
      <Stack :gap="3">
        <Text as="h2" type="text20Semibold">Inputs</Text>
        <Input size="md" placeholder="Default input" />
        <Input size="md" invalid placeholder="Invalid input" />
      </Stack>
    </Card>

    <Box as="section" backgroundColor="surface" rounded="lg" shadow="md" :p="6">
      <Button variant="outline" @click="dialogOpen = true">Open dialog</Button>
      <Dialog :open="dialogOpen" size="sm" @close="dialogOpen = false">
        <Text as="h2" type="text20Semibold">Dialog</Text>
        <Text type="text14Regular" color="muted">
          The component owns the overlay, Escape and outside click; the page
          owns the open state.
        </Text>
      </Dialog>
    </Box>
  </Container>
</template>
<!-- #endregion docs:usage -->
