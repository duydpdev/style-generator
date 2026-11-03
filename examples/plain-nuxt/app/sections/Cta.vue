<script setup lang="ts">
import { INSTALL_COMMAND, INSTALL_URL } from "./content";
import Section from "./Section.vue";

import Button from "~/ui/button/Button.vue";
import Card from "~/ui/card/Card.vue";
import Input from "~/ui/input/Input.vue";
import Stack from "~/ui/stack/Stack.vue";
import Text from "~/ui/text/Text.vue";
</script>

<!-- The closing call to action: the install command and a link to the install guide. -->
<template>
  <Section id="cta">
    <Card padding="lg" shadow="lg" class="items-center text-center">
      <Text as="h2" type="text32Bold">Start from your own theme.json</Text>
      <Text type="text16Medium" color="muted">
        Add the package, run style-gen init, and import the generated CSS.
      </Text>
      <Stack :gap="3" align="stretch" class="w-full max-w-3xl">
        <Input
          readonly
          size="md"
          :value="INSTALL_COMMAND"
          :title="INSTALL_COMMAND"
          aria-label="Install command"
          class="font-mono"
        />
        <Button as="a" :href="INSTALL_URL" size="md" class="self-center">
          Read the install guide
        </Button>
      </Stack>
    </Card>
  </Section>
</template>
