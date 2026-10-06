import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

/**
 *
 * @param root0
 * @param root0.children
 * @param root0.className
 */
export function Icon({ children, className = "ic" }: Readonly<Props>) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      {children}
    </svg>
  );
}

export const ArrowRight = () => (
  <Icon>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </Icon>
);

export const Check = () => (
  <Icon>
    <path d="M3 8l3.5 3.5L13 5" />
  </Icon>
);

export const Cross = () => (
  <Icon>
    <path d="M4 4l8 8M12 4 4 12" />
  </Icon>
);

export const Sun = () => (
  <Icon>
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M3.5 12.5l1.4-1.4M11.1 4.9l1.4-1.4" />
  </Icon>
);
