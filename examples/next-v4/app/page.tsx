import { ThemeSwitch } from "./ThemeSwitch";

// Every class below comes from a theme.json token: theme.css lists them in
// `@source inline(...)`, so Tailwind emits them without scanning a recipe.
const SWATCHES = [
  {
    name: "primary",
    className: "rounded-pill bg-primary px-3 py-1 text-12-mono text-on-primary",
  },
  {
    name: "secondary",
    className:
      "rounded-pill bg-secondary px-3 py-1 text-12-mono text-background",
  },
  {
    name: "accent",
    className: "rounded-pill bg-accent px-3 py-1 text-12-mono text-background",
  },
  {
    name: "success",
    className: "rounded-pill bg-success px-3 py-1 text-12-mono text-background",
  },
  {
    name: "danger",
    className: "rounded-pill bg-danger px-3 py-1 text-12-mono text-background",
  },
] as const;

export default function Page() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10">
      {/* #region docs:usage */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-12-mono text-muted">
            @duydpdev/style-generator · Next.js 16
          </p>
          <h1 className="font-serif display-56-serif">Generated utilities</h1>
        </div>
        <ThemeSwitch />
      </header>

      <section className="flex flex-col gap-4 rounded-lg bg-surface p-6 shadow-md">
        <h2 className="text-20-semibold">Colors</h2>
        <ul className="flex flex-wrap gap-2">
          {SWATCHES.map(({ name, className }) => (
            <li key={name} className={className}>
              {name}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="self-start rounded-md bg-primary px-4 py-2 text-16-medium text-on-primary hover:bg-primary-hover active:bg-primary-active"
        >
          Primary action
        </button>
      </section>
      {/* #endregion docs:usage */}
    </main>
  );
}
