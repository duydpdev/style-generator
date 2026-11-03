<script setup lang="ts">
import Box from "~/ui/box/Box.vue";
</script>

<!-- The page column: centred, max 64rem, side padding. -->
<template>
  <Box class="mx-auto w-full max-w-5xl" :px="6"><slot /></Box>
</template>
