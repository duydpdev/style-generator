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
      <Box
        as="span"
        style={{
          fontFamily: '"Instrument Serif", serif',
          fontStyle: "italic",
          fontSize: 22,
          lineHeight: 1,
        }}
      >
        Aa
      </Box>
    ),
  },
  {
    val: "industrial",
    name: "Industrial",
    meta: "Space Grotesk",
    render: () => (
      <Box
        as="span"
        style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 600,
          fontSize: 22,
          lineHeight: 1,
        }}
      >
        Aa
      </Box>
    ),
  },
  {
    val: "humanist",
    name: "Humanist",
    meta: "DM Serif + Sans",
    render: () => (
      <Box
        as="span"
        style={{
          fontFamily: '"DM Serif Display", serif',
          fontSize: 22,
          lineHeight: 1,
        }}
      >
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
    render: () => (
      <Box as="span" data-part="sg-tweak-shape" style={{ borderRadius: 0 }} />
    ),
  },
  {
    val: "soft",
    name: "Soft",
    meta: "6–16px",
    render: () => (
      <Box as="span" data-part="sg-tweak-shape" style={{ borderRadius: 10 }} />
    ),
  },
  {
    val: "pillowy",
    name: "Pillowy",
    meta: "12–32px",
    render: () => (
      <Box as="span" data-part="sg-tweak-shape" style={{ borderRadius: 20 }} />
    ),
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
