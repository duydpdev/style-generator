import { Box } from "../components/Box";
import { Button } from "../components/Button";
import { Text } from "../components/Text";

import type {
  Geometry,
  StyleGuideState,
  Surface,
  TweakSetter,
  Voice,
} from "./types";

interface TweaksPanelProps {
  open: boolean;
  onClose: () => void;
  state: StyleGuideState;
  setTweak: TweakSetter;
  onReset: () => void;
}

interface Option<T extends string> {
  val: T;
  name: string;
  meta: string;
  render: () => React.ReactNode;
}

const VOICE_OPTS: Option<Voice>[] = [
  {
    val: "editorial",
    name: "Editorial",
    meta: "Instrument Serif",
    render: () => (
      <span
        style={{
          fontFamily: '"Instrument Serif", serif',
          fontStyle: "italic",
          fontSize: 22,
          lineHeight: 1,
        }}
      >
        Aa
      </span>
    ),
  },
  {
    val: "industrial",
    name: "Industrial",
    meta: "Space Grotesk",
    render: () => (
      <span
        style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 600,
          fontSize: 22,
          lineHeight: 1,
        }}
      >
        Aa
      </span>
    ),
  },
  {
    val: "humanist",
    name: "Humanist",
    meta: "DM Serif + Sans",
    render: () => (
      <span
        style={{
          fontFamily: '"DM Serif Display", serif',
          fontSize: 22,
          lineHeight: 1,
        }}
      >
        Aa
      </span>
    ),
  },
];

const GEOMETRY_OPTS: Option<Geometry>[] = [
  {
    val: "sharp",
    name: "Sharp",
    meta: "0–4px",
    render: () => (
      <span className="sg-tweak-shape" style={{ borderRadius: 0 }} />
    ),
  },
  {
    val: "soft",
    name: "Soft",
    meta: "6–16px",
    render: () => (
      <span className="sg-tweak-shape" style={{ borderRadius: 10 }} />
    ),
  },
  {
    val: "pillowy",
    name: "Pillowy",
    meta: "12–32px",
    render: () => (
      <span className="sg-tweak-shape" style={{ borderRadius: 20 }} />
    ),
  },
];

const SURFACE_OPTS: Option<Surface>[] = [
  {
    val: "flat",
    name: "Flat",
    meta: "Bordered",
    render: () => <span className="sg-tweak-surf sg-tweak-surf-flat" />,
  },
  {
    val: "lifted",
    name: "Lifted",
    meta: "Soft shadow",
    render: () => <span className="sg-tweak-surf sg-tweak-surf-lifted" />,
  },
  {
    val: "glass",
    name: "Glass",
    meta: "Blurred",
    render: () => <span className="sg-tweak-surf sg-tweak-surf-glass" />,
  },
];

interface TweakGroupProps<T extends string> {
  label: string;
  sub: string;
  options: Option<T>[];
  active: T;
  onPick: (val: T) => void;
}

const TweakGroup = <T extends string>({
  label,
  sub,
  options,
  active,
  onPick,
}: TweakGroupProps<T>) => (
  <Box
    pt={4}
    className="border-t first:border-t-0 first:pt-0 [&+&]:mt-4"
    style={{ borderColor: "var(--c-line)" }}
  >
    <Box className="mb-2 flex items-center justify-between">
      <Text
        type="text12Mono"
        color="muted"
        className="uppercase tracking-wider"
      >
        {label}
      </Text>
      <Text type="text12Mono" color="muted">
        {sub}
      </Text>
    </Box>
    <Box className="grid grid-cols-3 gap-1.5">
      {options.map((o) => (
        <button
          key={o.val}
          type="button"
          className="sg-tweak-opt"
          aria-pressed={active === o.val}
          onClick={() => {
            onPick(o.val);
          }}
        >
          {o.render()}
          <span className="text-[12px] font-medium">{o.name}</span>
          <span
            className="sg-font-mono text-[9.5px]"
            style={{ color: "var(--color-muted)" }}
          >
            {o.meta}
          </span>
        </button>
      ))}
    </Box>
  </Box>
);

export const TweaksPanel = ({
  open,
  onClose,
  state,
  setTweak,
  onReset,
}: TweaksPanelProps) => {
  return (
    <aside
      className="sg-tweaks-panel"
      data-open={open ? "true" : "false"}
      aria-hidden={!open}
    >
      <Box mb={4} className="flex items-start justify-between">
        <Box>
          <Text
            type="text12Mono"
            color="muted"
            className="uppercase tracking-widest"
          >
            Tweaks
          </Text>
          <Text type="text16Medium" className="font-semibold">
            Reshape the feel
          </Text>
        </Box>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </Box>

      <TweakGroup
        label="Voice"
        sub="typography pairing"
        options={VOICE_OPTS}
        active={state.voice}
        onPick={(v) => {
          setTweak("voice", v);
        }}
      />
      <TweakGroup
        label="Geometry"
        sub="radius personality"
        options={GEOMETRY_OPTS}
        active={state.geometry}
        onPick={(v) => {
          setTweak("geometry", v);
        }}
      />
      <TweakGroup
        label="Surface"
        sub="depth treatment"
        options={SURFACE_OPTS}
        active={state.surface}
        onPick={(v) => {
          setTweak("surface", v);
        }}
      />

      <Box
        mt={4}
        pt={3}
        className="flex items-center justify-between border-t"
        style={{ borderColor: "var(--c-line)" }}
      >
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
        <Text type="text12Mono" color="muted">
          Edits persist on save
        </Text>
      </Box>
    </aside>
  );
};
