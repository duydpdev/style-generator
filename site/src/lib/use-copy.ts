import { useCallback, useRef, useState } from "react";

/**
 *
 * @param resetMs
 */
export function useCopy(resetMs = 1200) {
  const [copied, setCopied] = useState(false);
  const tRef = useRef<number | null>(null);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Clipboard API may be unavailable (insecure context) — ignore.
      }
      setCopied(true);
      if (tRef.current !== null) window.clearTimeout(tRef.current);
      tRef.current = window.setTimeout(() => {
        setCopied(false);
      }, resetMs);
    },
    [resetMs],
  );

  return { copied, copy };
}
