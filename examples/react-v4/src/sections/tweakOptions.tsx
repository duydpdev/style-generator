import { Box } from "../ui";

import type { Geometry, Surface, Voice } from "./types";

export interface Option<T extends string> {
  val: T;
  name: string;
  meta: string;
  render: () => React.ReactNode;
}

export const VOICE_OPTS: Option<Voice>[] = [
  {
    val: "editorial",
    name: "Editorial",
    meta: "Instrument Serif",
    render: () => (
      <Box as="span" data-part="voice-sample voice-editorial">
        Aa
      </Box>
    ),
  },
  {
    val: "industrial",
    name: "Industrial",
    meta: "Space Grotesk",
    render: () => (
      <Box as="span" data-part="voice-sample voice-industrial">
        Aa
      </Box>
    ),
  },
  {
    val: "humanist",
    name: "Humanist",
    meta: "DM Serif + Sans",
    render: () => (
      <Box as="span" data-part="voice-sample voice-humanist">
        Aa
      </Box>
    ),
  },
];

export const GEOMETRY_OPTS: Option<Geometry>[] = [
  {
    val: "sharp",
    name: "Sharp",
    meta: "0–4px",
    render: () => <Box as="span" data-part="sg-tweak-shape shape-sharp" />,
  },
  {
    val: "soft",
    name: "Soft",
    meta: "6–16px",
    render: () => <Box as="span" data-part="sg-tweak-shape shape-soft" />,
  },
  {
    val: "pillowy",
    name: "Pillowy",
    meta: "12–32px",
    render: () => <Box as="span" data-part="sg-tweak-shape shape-pillowy" />,
  },
];

export const SURFACE_OPTS: Option<Surface>[] = [
  {
    val: "flat",
    name: "Flat",
    meta: "Bordered",
    render: () => (
      <Box as="span" data-part="sg-tweak-surf sg-tweak-surf-flat" />
    ),
  },
  {
    val: "lifted",
    name: "Lifted",
    meta: "Soft shadow",
    render: () => (
      <Box as="span" data-part="sg-tweak-surf sg-tweak-surf-lifted" />
    ),
  },
  {
    val: "glass",
    name: "Glass",
    meta: "Blurred",
    render: () => (
      <Box as="span" data-part="sg-tweak-surf sg-tweak-surf-glass" />
    ),
  },
];
