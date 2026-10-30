import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { LandingPage } from "./pages/landing-page";
import { Text } from "./ui";

const DocsPage = lazy(() =>
  import("./pages/docs-page").then((m) => ({ default: m.DocsPage })),
);
const ExamplesPage = lazy(() =>
  import("./pages/examples-page").then((m) => ({ default: m.ExamplesPage })),
);
const NotFound = lazy(() =>
  import("./pages/not-found").then((m) => ({ default: m.NotFound })),
);

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "") || undefined;

export function App() {
  return (
    <BrowserRouter basename={BASE}>
      <Suspense
        fallback={
          <Text
            as="div"
            data-part="route-fallback"
            color="muted"
            align="center"
            px={8}
            py={20}
          >
            Loading…
          </Text>
        }
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/docs/:slug" element={<DocsPage />} />
          <Route path="/examples" element={<ExamplesPage />} />
          <Route path="/examples/:variant" element={<ExamplesPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
