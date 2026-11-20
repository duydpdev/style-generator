import { useEffect, useState } from "react";

import { PlaygroundEditor } from "../components/playground-editor";
import { PlaygroundOutput } from "../components/playground-output";
import { Topbar } from "../components/topbar";
import { runPlayground, type PlaygroundResult } from "../lib/playground";
import { SAMPLE_THEME } from "../lib/playground-sample";
import { useTheme } from "../lib/use-theme";
import { Box, Grid, Stack, Text } from "../ui";

/** Delay after the last keystroke before `generate()` runs again. */
const DEBOUNCE_MS = 300;

export function PlaygroundPage() {
  const { toggle } = useTheme();
  const [theme, setTheme] = useState(SAMPLE_THEME);
  const [options, setOptions] = useState("");
  const [result, setResult] = useState<PlaygroundResult>(() =>
    runPlayground(SAMPLE_THEME, ""),
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setResult(runPlayground(theme, options));
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [theme, options]);

  return (
    <>
      <Topbar
        activeChapter={null}
        activeRoute="playground"
        onToggleTheme={toggle}
      />
      <Box as="main" className="s-container" maxWidth={1440} px={8} py={8}>
        <Stack gap={5}>
          <Stack gap={1.5}>
            <Text as="h1" type="displayChapter">
              Playground
            </Text>
            <Text as="p" color="muted">
              Edit a theme JSON: <code>generate()</code> runs in your browser
              and prints the CSS and the typed tokens, or the validation error.
            </Text>
          </Stack>
          <Grid className="s-playground-grid" gap={6}>
            <PlaygroundEditor
              theme={theme}
              options={options}
              onTheme={setTheme}
              onOptions={setOptions}
            />
            <PlaygroundOutput result={result} />
          </Grid>
        </Stack>
      </Box>
    </>
  );
}
