import { EXAMPLE_FILES, type Variant } from "../lib/example-files";
import { META } from "../lib/examples-meta";
import { Box, Flex, Grid, Stack, Text } from "../ui";

import { FileTree } from "./file-tree";

interface Props {
  variant: Variant;
  open: boolean;
  activePath: string | null;
  onOpen: (path: string) => void;
  onSelectVariant: (variant: Variant) => void;
}

const FOOT_LINK = "https://github.com/duydpdev/style-generator/tree/main";

/**
 * Examples sidebar: version switcher, file tree and source footer. Below 860px
 * it is an overlay (`open` slides it in).
 * @param root0 - Component props
 * @param root0.variant - Active example variant
 * @param root0.open - Whether the overlay is open
 * @param root0.activePath - Path of the file shown in the editor
 * @param root0.onOpen - Opens a file
 * @param root0.onSelectVariant - Switches the example variant
 */
export function ExamplesSidebar({
  variant,
  open,
  activePath,
  onOpen,
  onSelectVariant,
}: Readonly<Props>) {
  return (
    <Stack
      as="aside"
      id="ex-sidebar"
      data-part={`ex-sidebar${open ? " open" : ""}`}
    >
      <Box data-part="version-switch" pt={4} px={4} pb={3.5}>
        <Text as="div" data-part="version-switch-label" color="muted" mb={2}>
          Tailwind version
        </Text>
        <Grid
          data-part="version-pills"
          role="tablist"
          flow="column"
          gap={1}
          p={0.75}
          rounded="md"
        >
          {(Object.keys(META) as Variant[]).map((key) => {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Variant is a single-member union today; the comparison must stay so the switcher keeps working when more variants are added
            const isActive = key === variant;
            return (
              <Flex
                as="button"
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                data-part={`version-pill${isActive ? " active" : ""}`}
                align="center"
                justify="center"
                gap={1.5}
                px={2.5}
                py={1.75}
                minWidth={0}
                backgroundColor={isActive ? "paper" : undefined}
                onClick={() => {
                  onSelectVariant(key);
                }}
              >
                <Box as="span">{META[key].label}</Box>
                {META[key].badge ? (
                  <Box
                    as="span"
                    data-part="version-badge"
                    px={1.25}
                    py={0.25}
                    rounded="pill"
                    backgroundColor="primarySoft"
                  >
                    {META[key].badge}
                  </Box>
                ) : null}
              </Flex>
            );
          })}
        </Grid>
      </Box>

      <Box data-part="sidebar-scroll" pt={3} px={2} pb={6}>
        <FileTree
          sections={EXAMPLE_FILES[variant]}
          activePath={activePath}
          onOpen={onOpen}
        />
      </Box>

      <Stack data-part="sidebar-foot" py={3} px={4} gap={1.5}>
        <Flex justify="between">
          <Box as="span">SOURCE</Box>
          <Box as="span">examples/react-{variant}</Box>
        </Flex>
        <Flex justify="between">
          <Box as="span">SHARED</Box>
          <Box as="span">examples/design-system</Box>
        </Flex>
        <Flex justify="between">
          <Box as="span">BUNDLE</Box>
          <Box as="span">{META[variant].bundler}</Box>
        </Flex>
        <Flex justify="between">
          <Box as="span">OPEN</Box>
          <a
            href={`${FOOT_LINK}/examples/react-${variant}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            github ↗
          </a>
        </Flex>
      </Stack>
    </Stack>
  );
}
