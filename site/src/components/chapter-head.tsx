import type { ReactNode } from "react";

import { Text } from "../ui";

interface MarkerProps {
  num: string;
}

interface Props {
  num: string;
  label: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
}

/**
 * The oversized italic chapter number that floats in the right margin.
 * @param root0
 * @param root0.num
 */
export function ChapterMarker({ num }: Readonly<MarkerProps>) {
  return (
    <Text as="div" className="s-ch-marker" color="foreground">
      {num}
    </Text>
  );
}

/**
 * Header block shared by the landing chapters: marker, eyebrow, title, lede.
 * @param root0
 * @param root0.num
 * @param root0.label
 * @param root0.title
 * @param root0.lede
 */
export function ChapterHead({ num, label, title, lede }: Readonly<Props>) {
  return (
    <>
      <ChapterMarker num={num} />
      <Text as="div" className="s-ch-eyebrow" color="muted" mb={3.5} gap={2.5}>
        <Text as="span">
          Ch. <Text as="b">{num}</Text>
        </Text>
        <Text as="span">· {label}</Text>
      </Text>
      <Text as="h2" className="s-ch-title" color="foreground" mb={4.5}>
        {title}
      </Text>
      {lede !== undefined && (
        <Text as="p" className="s-ch-lede" color="muted" mb={8}>
          {lede}
        </Text>
      )}
    </>
  );
}
