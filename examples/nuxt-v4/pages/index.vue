<script setup lang="ts">
import Box from "~/components/Box.vue";
import TopbarSection from "~/components/sections/TopbarSection.vue";
import HeroSection from "~/components/sections/HeroSection.vue";
import ColorSection from "~/components/sections/ColorSection.vue";
import TypographySection from "~/components/sections/TypographySection.vue";
import UtilitiesSection from "~/components/sections/UtilitiesSection.vue";
import ResponsiveSpacingSection from "~/components/sections/ResponsiveSpacingSection.vue";
import ButtonSection from "~/components/sections/ButtonSection.vue";
import FooterSection from "~/components/sections/FooterSection.vue";
import JsonDrawer from "~/components/sections/JsonDrawer.vue";
import TweaksPanel from "~/components/sections/TweaksPanel.vue";
</script>

<template>
  <div>
    <TopbarSection />

    <Box class="mx-auto max-w-[1240px] px-8">
      <HeroSection />
      <ColorSection />
      <TypographySection />
      <UtilitiesSection />
      <ResponsiveSpacingSection />
      <ButtonSection />
      <FooterSection />
    </Box>

    <JsonDrawer />
    <TweaksPanel />
  </div>
</template>
