<script setup lang="ts">
import Box from "~/components/Box.vue";
import Text from "~/components/Text.vue";
import Button from "~/components/Button.vue";
import { useStyleGuide } from "~/composables/useStyleGuide";
import { useDrawers } from "~/composables/useDrawers";
import type { Geometry, Surface, Voice } from "~/data/types";

const { state, setTweak, reset } = useStyleGuide();
const { tweaksOpen } = useDrawers();

const VOICE_OPTS: {
  val: Voice;
  name: string;
  meta: string;
  style: Record<string, string>;
}[] = [
  {
    val: "editorial",
    name: "Editorial",
    meta: "Instrument Serif",
    style: {
      fontFamily: '"Instrument Serif", serif',
      fontStyle: "italic",
      fontSize: "22px",
      lineHeight: "1",
    },
  },
  {
    val: "industrial",
    name: "Industrial",
    meta: "Space Grotesk",
    style: {
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: "600",
      fontSize: "22px",
      lineHeight: "1",
    },
  },
  {
    val: "humanist",
    name: "Humanist",
    meta: "DM Serif + Sans",
    style: {
      fontFamily: '"DM Serif Display", serif',
      fontSize: "22px",
      lineHeight: "1",
    },
  },
];

const GEOMETRY_OPTS: {
  val: Geometry;
  name: string;
  meta: string;
  radius: string;
}[] = [
  { val: "sharp", name: "Sharp", meta: "0–4px", radius: "0" },
  { val: "soft", name: "Soft", meta: "6–16px", radius: "10px" },
  { val: "pillowy", name: "Pillowy", meta: "12–32px", radius: "20px" },
];

const SURFACE_OPTS: {
  val: Surface;
  name: string;
  meta: string;
  cls: string;
}[] = [
  { val: "flat", name: "Flat", meta: "Bordered", cls: "sg-tweak-surf-flat" },
  {
    val: "lifted",
    name: "Lifted",
    meta: "Soft shadow",
    cls: "sg-tweak-surf-lifted",
  },
  { val: "glass", name: "Glass", meta: "Blurred", cls: "sg-tweak-surf-glass" },
];
</script>

<template>
  <aside
    class="sg-tweaks-panel"
    :data-open="tweaksOpen ? 'true' : 'false'"
    :aria-hidden="!tweaksOpen"
  >
    <Box :mb="4" class="flex items-start justify-between">
      <Box>
        <Text type="text12Mono" color="muted" class="uppercase tracking-widest">
          Tweaks
        </Text>
        <Text type="text16Medium" class="font-semibold">Reshape the feel</Text>
      </Box>
      <Button variant="ghost" size="sm" @click="tweaksOpen = false">×</Button>
    </Box>

    <!-- Voice -->
    <Box
      :pt="4"
      class="border-t first:border-t-0 first:pt-0 [&+&]:mt-4"
      :style="{ borderColor: 'var(--c-line)' }"
    >
      <Box class="mb-2 flex items-center justify-between">
        <Text type="text12Mono" color="muted" class="uppercase tracking-wider">
          Voice
        </Text>
        <Text type="text12Mono" color="muted">typography pairing</Text>
      </Box>
      <Box class="grid grid-cols-3 gap-1.5">
        <button
          v-for="o in VOICE_OPTS"
          :key="o.val"
          type="button"
          class="sg-tweak-opt"
          :aria-pressed="state.voice === o.val"
          @click="setTweak('voice', o.val)"
        >
          <span :style="o.style">Aa</span>
          <span class="text-[12px] font-medium">{{ o.name }}</span>
          <span
            class="sg-font-mono text-[9.5px]"
            :style="{ color: 'var(--color-muted)' }"
          >
            {{ o.meta }}
          </span>
        </button>
      </Box>
    </Box>

    <!-- Geometry -->
    <Box
      :pt="4"
      class="border-t [&+&]:mt-4"
      :style="{ borderColor: 'var(--c-line)' }"
    >
      <Box class="mb-2 flex items-center justify-between">
        <Text type="text12Mono" color="muted" class="uppercase tracking-wider">
          Geometry
        </Text>
        <Text type="text12Mono" color="muted">radius personality</Text>
      </Box>
      <Box class="grid grid-cols-3 gap-1.5">
        <button
          v-for="o in GEOMETRY_OPTS"
          :key="o.val"
          type="button"
          class="sg-tweak-opt"
          :aria-pressed="state.geometry === o.val"
          @click="setTweak('geometry', o.val)"
        >
          <span class="sg-tweak-shape" :style="{ borderRadius: o.radius }" />
          <span class="text-[12px] font-medium">{{ o.name }}</span>
          <span
            class="sg-font-mono text-[9.5px]"
            :style="{ color: 'var(--color-muted)' }"
          >
            {{ o.meta }}
          </span>
        </button>
      </Box>
    </Box>

    <!-- Surface -->
    <Box
      :pt="4"
      class="border-t [&+&]:mt-4"
      :style="{ borderColor: 'var(--c-line)' }"
    >
      <Box class="mb-2 flex items-center justify-between">
        <Text type="text12Mono" color="muted" class="uppercase tracking-wider">
          Surface
        </Text>
        <Text type="text12Mono" color="muted">depth treatment</Text>
      </Box>
      <Box class="grid grid-cols-3 gap-1.5">
        <button
          v-for="o in SURFACE_OPTS"
          :key="o.val"
          type="button"
          class="sg-tweak-opt"
          :aria-pressed="state.surface === o.val"
          @click="setTweak('surface', o.val)"
        >
          <span class="sg-tweak-surf" :class="o.cls" />
          <span class="text-[12px] font-medium">{{ o.name }}</span>
          <span
            class="sg-font-mono text-[9.5px]"
            :style="{ color: 'var(--color-muted)' }"
          >
            {{ o.meta }}
          </span>
        </button>
      </Box>
    </Box>

    <Box
      :mt="4"
      :pt="3"
      class="flex items-center justify-between border-t"
      :style="{ borderColor: 'var(--c-line)' }"
    >
      <Button variant="ghost" size="sm" @click="reset">Reset</Button>
      <Text type="text12Mono" color="muted">Edits persist on save</Text>
    </Box>
  </aside>
</template>
