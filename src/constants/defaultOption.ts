export const roundedOptionBase = [
  "none",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "full",
] as const;

export const borderOption = [0, 1, 2, 3, 4, 8] as const;

export const spacingOption = [
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9,
  9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17,
  17.5, 18, 18.5, 19, 19.5, 20, 20.5, 21, 21.5, 22, 22.5, 23, 23.5, 24, 24.5,
  25, 25.5, 26, 26.5, 27, 27.5, 28, 28.5, 29, 29.5, 30, 32, 36, 40, 44, 48, 52,
  56, 60, 64, 72, 80, 96,
] as const;

export const opacityOption = [
  0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95,
  100,
] as const;

export const zIndexOption = [0, 10, 20, 30, 40, 50, "auto"] as const;
