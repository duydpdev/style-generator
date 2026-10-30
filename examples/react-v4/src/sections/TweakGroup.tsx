import { Box, Flex, Grid, Text } from "../ui";

import type { Option } from "./tweakOptions";

interface TweakGroupProps<T extends string> {
  label: string;
  sub: string;
  options: Option<T>[];
  active: T;
  onPick: (val: T) => void;
  first?: boolean;
}

export const TweakGroup = <T extends string>({
  label,
  sub,
  options,
  active,
  onPick,
  first,
}: TweakGroupProps<T>) => (
  <Box
    pt={4}
    mt={first ? 0 : 4}
    borderT="thin"
    style={{ borderColor: "var(--c-line)" }}
  >
    <Flex mb={2} align="center" justify="between">
      <Text type="text12Mono" color="muted" data-part="caps-wide">
        {label}
      </Text>
      <Text type="text12Mono" color="muted">
        {sub}
      </Text>
    </Flex>
    <Grid columns={3} gap={1.5}>
      {options.map((o) => (
        <Box
          as="button"
          key={o.val}
          type="button"
          data-part="sg-tweak-opt"
          aria-pressed={active === o.val}
          onClick={() => {
            onPick(o.val);
          }}
        >
          {o.render()}
          <Box as="span" data-part="tweak-opt-name">
            {o.name}
          </Box>
          <Box
            as="span"
            data-part="sg-font-mono tweak-opt-meta"
            style={{ color: "var(--color-muted)" }}
          >
            {o.meta}
          </Box>
        </Box>
      ))}
    </Grid>
  </Box>
);
