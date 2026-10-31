import { useEffect, useRef, useState } from "react";

import { Box, Flex, Stack, Text } from "../ui";

export interface TermLine {
  html: string;
  delay: number;
}

interface Props {
  lines: TermLine[];
  filename?: string;
}

/**
 *
 * @param root0
 * @param root0.lines
 * @param root0.filename
 */
export function TerminalTypewriter({
  lines,
  filename = "~/my-app · zsh",
}: Readonly<Props>) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !started) {
            setStarted(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
    };
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let idx = 0;
    let cancel = false;
    const tick = () => {
      if (cancel || idx >= lines.length) return;
      const line = lines[idx];
      setShown(idx + 1);
      idx++;
      window.setTimeout(tick, line.delay);
    };
    tick();
    return () => {
      cancel = true;
    };
  }, [started, lines]);

  // Every line is rendered from the first paint (hidden until revealed), so
  // the box never grows; this only matters when the body itself overflows.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown]);

  return (
    <Stack data-part="terminal" minHeight={320} rounded="lg">
      <Flex data-part="code-head" align="center" gap={2} px={4} py={3}>
        <Flex as="span" gap={1.25}>
          <Box as="span" data-part="dot" width={10} height={10} />
          <Box as="span" data-part="dot" width={10} height={10} />
          <Box as="span" data-part="dot" width={10} height={10} />
        </Flex>
        <Text as="span" data-part="filename" ml={1.5}>
          {filename}
        </Text>
      </Flex>
      <Box
        ref={bodyRef}
        data-part="terminal-body"
        data-testid="terminal-body"
        px={4.5}
        py={4}
      >
        {lines.map((l, i) => {
          const revealed = i < shown;
          return (
            <Text
              as="div"
              key={i}
              data-part="line"
              data-line-state={revealed ? "shown" : "pending"}
              aria-hidden={!revealed}
              style={{ visibility: revealed ? "visible" : "hidden" }}
              dangerouslySetInnerHTML={{ __html: l.html }}
            />
          );
        })}
      </Box>
    </Stack>
  );
}
