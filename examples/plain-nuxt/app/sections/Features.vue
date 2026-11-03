<script setup lang="ts">
import { FEATURES } from "./content";
import Section from "./Section.vue";
import SectionHead from "./SectionHead.vue";

import Badge from "~/ui/badge/Badge.vue";
import Card from "~/ui/card/Card.vue";
import Grid from "~/ui/grid/Grid.vue";
import Text from "~/ui/text/Text.vue";
</script>

<!-- Six feature cards in a responsive grid. -->
<template>
  <Section id="features">
    <SectionHead
      eyebrow="Features"
      title="Everything comes from the theme"
      lede="Change one token and every utility, type and component follows."
    />
    <Grid :columns="{ base: 1, md: 2, lg: 3 }" :gap="4">
      <Card v-for="feature in FEATURES" :key="feature.title" as="article">
        <Badge color="secondary" class="self-start">{{ feature.tag }}</Badge>
        <Text as="h3" type="text20Semibold">{{ feature.title }}</Text>
        <Text type="text14Regular" color="muted">{{ feature.body }}</Text>
      </Card>
    </Grid>
  </Section>
</template>
