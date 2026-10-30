import type { JSX } from "react";

import type { LooseProps } from "../shared/types";

import type { SelectDeps } from "./Select.types";

export const createSelect = (deps: SelectDeps) =>
  function Select({
    className,
    size,
    invalid,
    ...rest
  }: LooseProps): JSX.Element {
    return (
      <select
        {...rest}
        aria-invalid={invalid === true ? true : undefined}
        className={deps.cn(deps.select({ size, invalid }), className)}
      />
    );
  };
