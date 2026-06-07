<script setup lang="ts">
import Box from "~/components/Box.vue";
import Text from "~/components/Text.vue";
import Button from "~/components/Button.vue";
import { useStyleGuide } from "~/composables/useStyleGuide";
import { useDrawers } from "~/composables/useDrawers";

const TAILWIND_VERSION = 4 as const;

const { state, toggleTheme } = useStyleGuide();
const { jsonOpen, tweaksOpen } = useDrawers();
</script>

<template>
  <header class="sg-topbar">
    <Box
      :px="8"
      class="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-6"
    >
      <Box :gap="3" class="flex items-center">
        <span class="sg-brand-mark" aria-hidden />
        <Box class="flex flex-col leading-tight">
          <Text type="text14Regular" class="font-medium">
            @duydpdev/style-generator
          </Text>
          <Text type="text12Mono" color="muted">
            v0.2 · tokens → tailwind v{{ TAILWIND_VERSION }}
          </Text>
        </Box>
      </Box>
      <Box :gap="2" class="flex items-center">
        <Button variant="ghost" size="sm" @click="tweaksOpen = !tweaksOpen">
          Tweaks
        </Button>
        <Button variant="ghost" size="sm" @click="toggleTheme">
          {{ state.theme === "dark" ? "Dark" : "Light" }}
        </Button>
        <Button variant="outline" size="sm" @click="jsonOpen = true">
          theme.json
        </Button>
      </Box>
    </Box>
  </header>
</template>
