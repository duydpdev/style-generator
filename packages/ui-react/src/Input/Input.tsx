import type { JSX } from "react";

import type { LooseProps } from "../shared/types";

import type { InputDeps } from "./Input.types";

export const createInput = (deps: InputDeps) =>
  function Input({
    className,
    size,
    invalid,
    ...rest
  }: LooseProps): JSX.Element {
    return (
      <input
        {...rest}
        aria-invalid={invalid === true ? true : undefined}
        className={deps.cn(deps.input({ size, invalid }), className)}
      />
    );
  };
