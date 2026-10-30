import { Box } from "../ui";

const TONES = {
  warn: { part: "pill-warn", tint: "dangerSoft" },
  good: { part: "pill-good", tint: "successSoft" },
  info: { part: "pill-info", tint: "primarySoft" },
} as const;

interface Props {
  tone: keyof typeof TONES;
  children: string;
}

/**
 * Small mono tag used in the comparison table.
 * @param root0
 * @param root0.tone
 * @param root0.children
 */
export function Pill({ tone, children }: Readonly<Props>) {
  const { part, tint } = TONES[tone];
  return (
    <Box
      as="span"
      data-part={`pill ${part}`}
      rounded="pill"
      px={1.75}
      py={0.5}
      mr={1.5}
      backgroundColor={tint}
    >
      {children}
    </Box>
  );
}
