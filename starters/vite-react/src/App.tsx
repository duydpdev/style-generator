// Every class below comes from styles/theme.json: edit the theme, not the markup.
export function App() {
  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.dataset.theme === "dark") delete root.dataset.theme;
    else root.dataset.theme = "dark";
  };

  return (
    <main className="bg-surface min-h-screen p-8">
      <section className="bg-surface text-foreground rounded-card mx-auto max-w-md border p-8">
        <h1 className="heading text-foreground">style-generator</h1>
        <p className="body text-foreground mt-3">
          Edit <code>styles/theme.json</code> and watch this card change.
        </p>
        <button
          type="button"
          className="bg-primary text-on-primary rounded-card mt-6 px-4 py-2"
          onClick={toggleTheme}
        >
          Toggle dark theme
        </button>
      </section>
    </main>
  );
}
