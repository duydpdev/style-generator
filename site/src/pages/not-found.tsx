import { Link } from "react-router-dom";

import { DocsSidebar } from "../components/docs-sidebar";
import { Topbar } from "../components/topbar";
import { docs } from "../lib/docs-content";
import { useTheme } from "../lib/use-theme";

interface Props {
  /** Slug of the doc that was requested, when the miss happened under `/docs`. */
  missingDoc?: string;
}

export function NotFound({ missingDoc }: Readonly<Props>) {
  const { toggle } = useTheme();
  const inDocs = missingDoc !== undefined;

  const content = (
    <main
      className="docs-content"
      style={inDocs ? undefined : { margin: "0 auto", padding: "96px 32px" }}
    >
      <h1>Not found</h1>
      <p>
        {inDocs ? (
          <>
            Doc <code>{missingDoc}</code> does not exist.
          </>
        ) : (
          "This page does not exist."
        )}
      </p>
      <p>
        <Link to="/">Landing page</Link> ·{" "}
        <Link to={`/docs/${docs[0]?.slug ?? "guide"}`}>Docs</Link> ·{" "}
        <Link to="/examples/v4">Examples</Link>
      </p>
    </main>
  );

  return (
    <>
      <Topbar
        activeChapter={null}
        activeRoute={inDocs ? "docs" : "landing"}
        onToggleTheme={toggle}
      />
      {inDocs ? (
        <div className="docs-shell">
          <DocsSidebar />
          {content}
        </div>
      ) : (
        content
      )}
    </>
  );
}
