import type { tokens } from "design-system-example";
import { expectTypeOf } from "vitest";

import type { layoutOnly, ui } from "../tests/ui";

import type { ColorKey } from "./shared/types";

type TextProps = InstanceType<typeof ui.Text>["$props"];
expectTypeOf<TextProps["color"]>().toEqualTypeOf<
  ColorKey<typeof tokens> | undefined
>();
// @ts-expect-error a key outside the theme is rejected
export const badColor: TextProps["color"] = "notAColor";

type BoxProps = InstanceType<typeof ui.Box>["$props"];
// @ts-expect-error a spacing breakpoint outside the theme is rejected
export const badSpacing: BoxProps["p"] = { tablet: 4 };
export const okSpacing: BoxProps["p"] = { base: 2, md: 4 };

type ButtonProps = InstanceType<typeof ui.Button>["$props"];
// @ts-expect-error an intent outside the preset is rejected
export const badIntent: ButtonProps["color"] = "notAnIntent";

type ContainerProps = InstanceType<typeof ui.Container>["$props"];
// @ts-expect-error Container centres itself: no horizontal margins
export const badMargin: ContainerProps["mx"] = 2;

expectTypeOf<typeof layoutOnly>().not.toHaveProperty("Button");
expectTypeOf<typeof layoutOnly>().toHaveProperty("Text");
