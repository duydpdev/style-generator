import type { JSX } from "react";

import type { LooseProps } from "../shared/types";

import type { DialogDeps } from "./Dialog.types";

export const createDialog = (deps: DialogDeps) =>
  function Dialog({
    open,
    onClose,
    size,
    blur,
    className,
    children,
    ...rest
  }: LooseProps): JSX.Element | null {
    if (open !== true) return null;
    const close = onClose as () => void;
    return (
      <div
        className={deps.cn(deps.overlay({ blur }))}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
      >
        <div
          {...rest}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          autoFocus
          className={deps.cn(deps.dialog({ size }), className)}
        >
          {children}
        </div>
      </div>
    );
  };
