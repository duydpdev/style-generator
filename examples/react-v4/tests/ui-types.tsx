/*
 * Compile-time checks of the sample components, run by
 * `yarn workspace react-v4-example typecheck`: an unused
 * `@ts-expect-error` or a failing positive line fails the typecheck.
 */
import {
  boxPreset,
  buttonPreset,
  textPreset,
  tokens,
} from "design-system-example";
import type { RefObject } from "react";

import {
  createBox,
  createButton,
  createFlex,
  createGrid,
  createStack,
  createText,
} from "../src/ui/index";

const Box = createBox(tokens, boxPreset);
const Button = createButton(tokens, buttonPreset);
const Flex = createFlex(tokens);
const Grid = createGrid(tokens);
const Stack = createStack(tokens);
const Text = createText(tokens, textPreset);
declare const divRef: RefObject<HTMLDivElement | null>;

// Box: token keys, sizes and refs.
void (<Box backgroundColor="surface" width={240} maxWidth="40rem" />);
// @ts-expect-error not a colour key
void (<Box backgroundColor="nope" />);
// @ts-expect-error not a radius key
void (<Box rounded="xxl" />);
void (<Box ref={divRef} />);
// @ts-expect-error a div ref on a button
void (<Box as="button" ref={divRef} />);
void (<Box as="label" htmlFor="x" />);
// @ts-expect-error div has no htmlFor
void (<Box htmlFor="x" />);

// Box: layout props and colour steps (phase 04).
void (
  <Box
    display="inlineFlex"
    overflow="hidden"
    zIndex={10}
    opacity={50}
    cursor="notAllowed"
    pointerEvents="none"
    select="all"
    transition="colors"
    aspect="video"
    objectFit="scaleDown"
    visibility="collapse"
    ringColor="primary"
    outlineColor="primary/10"
    backgroundColor="primary/10"
    borderColor="line/10"
  />
);
// @ts-expect-error not a z-index step
void (<Box zIndex={11} />);
// @ts-expect-error not an opacity step
void (<Box opacity={55} />);
// @ts-expect-error 55 is not a declared opacity step
void (<Box backgroundColor="primary/55" />);
// @ts-expect-error zIndex takes numbers, not strings
void (<Box zIndex="10" />);
// @ts-expect-error table is not offered
void (<Box display="table" />);
// @ts-expect-error not a colour key
void (<Box ringColor="nope" />);

// Text: typography keys and spacing values.
void (<Text type="text16Medium" color="muted" mb={2} />);
// @ts-expect-error not a typography key
void (<Text type="h1" />);
// @ts-expect-error spacing takes numbers only
void (<Text mb="2" />);
void (
  <Text transform="uppercase" italic truncate lineClamp={3} wrap="balance" />
);
void (<Text color="primary/50" />);
// @ts-expect-error not a transform
void (<Text transform="bold" />);
// @ts-expect-error lineClamp stops at 6
void (<Text lineClamp={7} />);
// @ts-expect-error not a wrap mode
void (<Text wrap="wrap2" />);
// @ts-expect-error 55 is not a declared opacity step
void (<Text color="primary/55" />);
void (<Text as="h1" id="title" />);

// Flex / Stack: the as prop, breakpoints and spacing values.
void (<Flex as="label" htmlFor="x" />);
// @ts-expect-error div has no htmlFor
void (<Flex as="div" htmlFor="x" />);
void (<Flex gap={{ base: 2, md: 4 }} />);
// @ts-expect-error xl is not a configured breakpoint
void (<Flex gap={{ xl: 4 }} />);
// @ts-expect-error spacing takes numbers only
void (<Flex mx="auto" />);
void (<Stack gap={4} borderColor="surface" />);
void (<Flex grow shrink={false} basis="1/2" divideColor="line" />);
void (<Stack divideColor="primary/10" />);
// @ts-expect-error not a basis
void (<Flex basis="1/5" />);
// @ts-expect-error Stack has no grow
void (<Stack grow />);
// @ts-expect-error not a colour key
void (<Flex divideColor="nope" />);

// Grid: counts, track lists, breakpoints.
void (<Grid columns={{ base: 1, lg: 3 }} />);
void (<Grid columns="80px 1fr 80px" />);
void (<Grid columns={{ base: 1, md: "220px 1fr" }} />);
// @ts-expect-error xl is not a configured breakpoint
void (<Grid columns={{ xl: 2 }} />);
// @ts-expect-error columns is a count or a track list
void (<Grid columns={true} />);
void (<Grid columns={2} rows={3} />);
void (<Grid columns={2} rows="none" />);
// @ts-expect-error rows is 1-6 or none
void (<Grid columns={2} rows={7} />);

// Button: intents and the as prop.
void (<Button color="danger" mt={2} />);
// @ts-expect-error accent is a colour but not an intent
void (<Button color="accent" />);
void (<Button as="a" href="/x" />);
