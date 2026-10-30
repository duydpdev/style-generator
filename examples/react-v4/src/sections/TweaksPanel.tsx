import { Box, Button, Flex, Text } from "../ui";

import { TweakGroup } from "./TweakGroup";
import { GEOMETRY_OPTS, SURFACE_OPTS, VOICE_OPTS } from "./tweakOptions";
import type { StyleGuideState, TweakSetter } from "./types";

interface TweaksPanelProps {
  open: boolean;
  onClose: () => void;
  state: StyleGuideState;
  setTweak: TweakSetter;
  onReset: () => void;
}

export const TweaksPanel = ({
  open,
  onClose,
  state,
  setTweak,
  onReset,
}: TweaksPanelProps) => {
  return (
    <Box
      as="aside"
      data-part="sg-tweaks-panel"
      data-open={open ? "true" : "false"}
      aria-hidden={!open}
    >
      <Flex mb={4} align="start" justify="between">
        <Box>
          <Text type="text12Mono" color="muted" data-part="caps-widest">
            Tweaks
          </Text>
          <Text type="text16Medium" data-part="text-semibold">
            Reshape the feel
          </Text>
        </Box>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </Flex>

      <TweakGroup
        first
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

      <Flex
        mt={4}
        pt={3}
        align="center"
        justify="between"
        borderT="thin"
        style={{ borderColor: "var(--c-line)" }}
      >
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
        <Text type="text12Mono" color="muted">
          Edits persist on save
        </Text>
      </Flex>
    </Box>
  );
};
