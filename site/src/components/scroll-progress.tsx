import { Box } from "../ui";

interface Props {
  progress: number;
}

/**
 *
 * @param root0
 * @param root0.progress
 */
export function ScrollProgress({ progress }: Readonly<Props>) {
  return (
    <Box
      data-part="scroll-progress"
      position="fixed"
      height={2}
      style={{ transform: `scaleX(${String(progress)})` }}
    />
  );
}
