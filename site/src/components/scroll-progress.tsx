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
    <div
      className="scroll-progress"
      style={{ transform: `scaleX(${String(progress)})` }}
    />
  );
}
