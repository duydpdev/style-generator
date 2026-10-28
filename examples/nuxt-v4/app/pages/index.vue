<script setup lang="ts">
import {
  badgeRecipe,
  boxRecipe,
  buttonRecipe,
  cardRecipe,
  cn,
  dialogRecipe,
  inputRecipe,
  intents,
  splitSpacingProps,
  stackRecipe,
  textRecipe,
  tokens,
  type BoxSpacingProps,
} from "design-system-example";

/** Resolve the shared spacing props to the `sp-*` class and its CSS variables. */
const spaced = (props: BoxSpacingProps) =>
  splitSpacingProps(props, tokens.spacingProperties).spacing;

const BUTTON_VARIANTS = ["fill", "outline", "soft", "ghost", "link"] as const;

const section = spaced({ py: { base: 6, md: 10 }, px: 4 });
const gap = spaced({ gap: { base: 2, md: 4 } });

const main = cn(
  stackRecipe({ direction: "column" }),
  "mx-auto max-w-[960px]",
  section.className,
);
const header = stackRecipe({ justify: "between", wrap: true });
const buttons = cn(
  cardRecipe({ tone: "surface", padding: "lg" }),
  stackRecipe({ direction: "column" }),
  gap.className,
);
const buttonRow = cn(stackRecipe({ direction: "row", wrap: true }), "gap-2");
const inputs = cn(
  cardRecipe({ tone: "outline", padding: "md" }),
  stackRecipe({ direction: "column" }),
  "gap-3",
);
const dialogBox = cn(
  boxRecipe({ backgroundColor: "surface", rounded: "lg", shadow: "md" }),
  "relative p-6",
);
const kicker = textRecipe({ type: "text12Mono", color: "muted" });
const title = textRecipe({ type: "display56Serif" });
const heading = textRecipe({ type: "text20Semibold" });
const body = textRecipe({ type: "text14Regular", color: "muted" });
</script>

<template>
  <main :class="main" :style="section.style">
    <header :class="header">
      <div>
        <p :class="kicker">@duydpdev/style-generator · Nuxt 4</p>
        <h1 :class="title">Shared design system</h1>
      </div>
      <ThemeSwitch />
    </header>

    <section :class="buttons" :style="gap.style">
      <h2 :class="heading">Buttons</h2>
      <div v-for="color in intents" :key="color" :class="buttonRow">
        <span :class="badgeRecipe({ color })">{{ color }}</span>
        <button
          v-for="variant in BUTTON_VARIANTS"
          :key="variant"
          type="button"
          :class="buttonRecipe({ variant, color })"
        >
          {{ variant }}
        </button>
      </div>
    </section>

    <section :class="inputs">
      <h2 :class="heading">Inputs</h2>
      <input :class="inputRecipe({ size: 'md' })" placeholder="Default input" />
      <input
        :class="inputRecipe({ size: 'md', invalid: true })"
        placeholder="Invalid input"
        aria-invalid="true"
      />
    </section>

    <section :class="dialogBox">
      <div :class="dialogRecipe({ size: 'sm' })">
        <h2 :class="heading">Dialog</h2>
        <p :class="body">
          Headless panel recipe; the app owns the open state and the overlay.
        </p>
      </div>
    </section>
  </main>
</template>
