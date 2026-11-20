import { useState } from "react";

import type { PlaygroundResult } from "../lib/playground";
import { Box, Flex, Stack, Text } from "../ui";

type Tab = "css" | "tokens";

interface Props {
  result: PlaygroundResult;
}

/**
 * The generate() output of the playground: a CSS / Tokens switch, a copy
 * button, or the validation error. Everything is rendered as text.
 * @param root0 - Component props
 * @param root0.result - Outcome of `runPlayground()`
 */
export function PlaygroundOutput({ result }: Readonly<Props>) {
  const [tab, setTab] = useState<Tab>("css");
  const [copied, setCopied] = useState(false);

  if (!result.ok) {
    return (
      <Box
        role="alert"
        className="s-playground-error"
        p={4}
        rounded="md"
        minWidth={0}
      >
        <Text as="pre" type="mono">
          {result.message}
        </Text>
      </Box>
    );
  }

  const text = tab === "css" ? result.css : result.tokens;
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    });
  };

  return (
    <Stack gap={2} minWidth={0}>
      <Flex align="center" justify="between" gap={2}>
        <Flex role="tablist" gap={1} aria-label="Output">
          {(["css", "tokens"] as const).map((name) => (
            <Box
              key={name}
              as="button"
              type="button"
              role="tab"
              aria-selected={tab === name}
              className={`s-playground-tab${tab === name ? " s-active" : ""}`}
              px={3}
              py={1.5}
              rounded="md"
              onClick={() => {
                setTab(name);
              }}
            >
              {name === "css" ? "CSS" : "Tokens"}
            </Box>
          ))}
        </Flex>
        <Box
          as="button"
          type="button"
          className="s-playground-copy"
          px={3}
          py={1.5}
          rounded="md"
          onClick={copy}
        >
          {copied ? "Copied" : "Copy"}
        </Box>
      </Flex>
      <Text
        as="pre"
        type="mono"
        className="s-playground-output"
        data-testid="playground-output"
        p={3}
      >
        {text}
      </Text>
    </Stack>
  );
}
