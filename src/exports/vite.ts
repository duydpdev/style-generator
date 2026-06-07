/**
 * Subpath: `@duydpdev/style-generator/vite`
 *
 * Vite plugin that auto-emits `theme.css` + `safelist.txt` from a theme JSON.
 * Eliminates manual `predev`/`prebuild` scripts for Tailwind v4 consumers.
 *
 * Vite is an optional peer dependency — install separately:
 * `yarn add -D vite`
 */
export {
  styleGenVite,
  type StyleGenViteOptions,
} from "../features/vite/styleGenVitePlugin";
