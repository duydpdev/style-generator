export interface Chapter {
  id: string;
  num: string;
  label: string;
}

export const chapters: Chapter[] = [
  { id: "hero", num: "00", label: "Cover" },
  { id: "why", num: "01", label: "The Tailwind case" },
  { id: "compare", num: "02", label: "Side by side" },
  { id: "build", num: "03", label: "Input → Output" },
  { id: "features", num: "04", label: "API surface" },
  { id: "spacing", num: "05", label: "Zero-safelist spacing" },
  { id: "theming", num: "06", label: "Theming" },
  { id: "types", num: "07", label: "TypeScript" },
  { id: "tooling", num: "08", label: "Vite plugin" },
  { id: "start", num: "09", label: "Get started" },
];
