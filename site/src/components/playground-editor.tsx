import { Box, Stack, Text } from "../ui";

interface Props {
  theme: string;
  options: string;
  onTheme: (value: string) => void;
  onOptions: (value: string) => void;
}

/**
 * The two JSON inputs of the playground.
 * @param root0 - Component props
 * @param root0.theme - Theme JSON text
 * @param root0.options - Options JSON text (empty means `{}`)
 * @param root0.onTheme - Receives the new theme text
 * @param root0.onOptions - Receives the new options text
 */
export function PlaygroundEditor({
  theme,
  options,
  onTheme,
  onOptions,
}: Readonly<Props>) {
  return (
    <Stack gap={4} minWidth={0}>
      <Stack gap={1.5}>
        <Text as="label" htmlFor="pg-theme" type="mono" color="muted">
          Theme JSON
        </Text>
        <Box
          as="textarea"
          id="pg-theme"
          className="s-playground-input s-playground-theme"
          spellCheck={false}
          p={3}
          rounded="md"
          value={theme}
          onChange={(e: { target: { value: string } }) => {
            onTheme(e.target.value);
          }}
        />
      </Stack>
      <Stack gap={1.5}>
        <Text as="label" htmlFor="pg-options" type="mono" color="muted">
          Options JSON
        </Text>
        <Box
          as="textarea"
          id="pg-options"
          className="s-playground-input s-playground-options"
          placeholder="{}"
          spellCheck={false}
          p={3}
          rounded="md"
          value={options}
          onChange={(e: { target: { value: string } }) => {
            onOptions(e.target.value);
          }}
        />
      </Stack>
    </Stack>
  );
}
