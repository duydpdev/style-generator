import type { ReactNode } from "react";

/** `data-part` of each icon flavour: `ic` is the default 14px stroke icon. */
const VARIANTS = {
  plain: { part: "ic" },
  lock: { part: "ic lock" },
  folder: { part: "folder-ico" },
} as const;

interface Props {
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
}

/**
 *
 * @param root0
 * @param root0.children
 * @param root0.variant
 */
export function Icon({ children, variant = "plain" }: Readonly<Props>) {
  return (
    <svg
      data-part={VARIANTS[variant].part}
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
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

const FOLDER_PATH =
  "M1.5 4a1 1 0 011-1h3l1.2 1.5h6.8a1 1 0 011 1V12a1 1 0 01-1 1h-11a1 1 0 01-1-1V4z";

export const Folder = () => (
  <Icon variant="folder">
    <path d={FOLDER_PATH} />
  </Icon>
);

export const Files = () => (
  <Icon>
    <path d={FOLDER_PATH} />
  </Icon>
);

export const FileDoc = () => (
  <Icon>
    <path d="M3 1.5h6L13 5.5V14a.5.5 0 01-.5.5h-9A.5.5 0 013 14V2a.5.5 0 010-.5z" />
    <path d="M9 1.5V5h4" />
  </Icon>
);

export const Preview = () => (
  <Icon>
    <rect x="1.5" y="3" width="13" height="10" rx="1.5" />
    <path d="M1.5 6h13" />
  </Icon>
);

export const CodeBrackets = () => (
  <Icon>
    <path d="M5.5 11.5L2 8l3.5-3.5M10.5 4.5L14 8l-3.5 3.5" />
  </Icon>
);

export const External = () => (
  <Icon>
    <path d="M9.5 2.5h4v4M13.5 2.5L7 9M7 3H3.5A1.5 1.5 0 002 4.5v8A1.5 1.5 0 003.5 14h8a1.5 1.5 0 001.5-1.5V9" />
  </Icon>
);

export const Lock = () => (
  <Icon variant="lock">
    <rect x="3" y="7" width="10" height="7" rx="1" />
    <path d="M5 7V5a3 3 0 016 0v2" />
  </Icon>
);
