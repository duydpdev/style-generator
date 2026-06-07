import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { LandingPage } from "./pages/landing-page";
import { useTheme } from "./lib/use-theme";

const DocsPage = lazy(() =>
  import("./pages/docs-page").then((m) => ({ default: m.DocsPage })),
);
const ExamplesPage = lazy(() =>
  import("./pages/examples-page").then((m) => ({ default: m.ExamplesPage })),
);

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;

export function App() {
  // Mount the theme once at root so all routes share the same data-theme state.
  useTheme();

  return (
    <BrowserRouter basename={BASE}>
      <Suspense fallback={<div className="route-fallback">Loading…</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/docs/:slug" element={<DocsPage />} />
          <Route path="/examples" element={<ExamplesPage />} />
          <Route path="/examples/:variant" element={<ExamplesPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
