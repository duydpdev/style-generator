import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

/**
 *
 * @param root0
 * @param root0.children
 */
export function Icon({ children }: Readonly<Props>) {
  return (
    <svg data-part="ic" viewBox="0 0 16 16" aria-hidden="true">
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

export const Moon = () => (
  <Icon>
    <path d="M13.5 9.5A5.5 5.5 0 0 1 6.5 2.5a5.5 5.5 0 1 0 7 7z" />
  </Icon>
);

export const Menu = () => (
  <Icon>
    <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
  </Icon>
);
