<script setup lang="ts">
import { PLANS } from "./content";
import Section from "./Section.vue";
import SectionHead from "./SectionHead.vue";

import Badge from "~/ui/badge/Badge.vue";
import Button from "~/ui/button/Button.vue";
import Card from "~/ui/card/Card.vue";
import Flex from "~/ui/flex/Flex.vue";
import Grid from "~/ui/grid/Grid.vue";
import Stack from "~/ui/stack/Stack.vue";
import Text from "~/ui/text/Text.vue";
</script>

<!-- Three plans; the featured one gets a thicker primary border and a badge. -->
<template>
  <Section id="pricing">
    <SectionHead
      eyebrow="Pricing"
      title="Free and MIT licensed"
      lede="Every part ships in one package. Pick where to start."
    />
    <Grid :columns="{ base: 1, md: 3 }" :gap="4">
      <Card
        v-for="plan in PLANS"
        :key="plan.name"
        as="article"
        :tone="plan.featured ? 'surface' : 'muted'"
        :shadow="plan.featured ? 'md' : 'none'"
        :border="plan.featured ? 'thick' : 'thin'"
        :class="plan.featured ? 'border-primary' : undefined"
      >
        <Flex align="center" justify="between" :gap="2">
          <Text as="h3" type="text20Semibold">{{ plan.name }}</Text>
          <Badge v-if="plan.featured" color="primary" variant="solid">
            Popular
          </Badge>
        </Flex>
        <Text type="text32Bold">{{ plan.price }}</Text>
        <Text type="text14Regular" color="muted">{{ plan.summary }}</Text>
        <Stack as="ul" :gap="2" class="list-none">
          <Text
            v-for="item in plan.items"
            :key="item"
            as="li"
            type="text14Regular"
          >
            {{ item }}
          </Text>
        </Stack>
        <Button
          as="a"
          :href="plan.href"
          :variant="plan.featured ? 'fill' : 'outline'"
          class="mt-auto"
        >
          {{ plan.action }}
        </Button>
      </Card>
    </Grid>
  </Section>
</template>
