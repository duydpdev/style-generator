import { useEffect, useRef, useState } from "react";

/**
 * State of the file tree overlay (tablet/mobile): Escape closes it and gives
 * the focus back to the toggle button.
 * @returns Open flag, its setter, and the ref of the toggle button
 */
export function useFilesOverlay() {
  const [filesOpen, setFilesOpen] = useState(false);
  const filesToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!filesOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setFilesOpen(false);
      filesToggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [filesOpen]);

  return { filesOpen, setFilesOpen, filesToggleRef };
}
