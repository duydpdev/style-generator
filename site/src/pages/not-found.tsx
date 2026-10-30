import { Link } from "react-router-dom";

import { DocsSidebar } from "../components/docs-sidebar";
import { Topbar } from "../components/topbar";
import { docs } from "../lib/docs-content";
import { useTheme } from "../lib/use-theme";
import { Box, Container, Grid, Text } from "../ui";

interface Props {
  /** Slug of the doc that was requested, when the miss happened under `/docs`. */
  missingDoc?: string;
}

export function NotFound({ missingDoc }: Readonly<Props>) {
  const { toggle } = useTheme();
  const inDocs = missingDoc !== undefined;

  const body = (
    <>
      <Text as="h1">Not found</Text>
      <Text as="p">
        {inDocs ? (
          <>
            Doc <code>{missingDoc}</code> does not exist.
          </>
        ) : (
          "This page does not exist."
        )}
      </Text>
      <Text as="p">
        <Link to="/">Landing page</Link> ·{" "}
        <Link to={`/docs/${docs[0]?.slug ?? "introduction"}`}>Docs</Link> ·{" "}
        <Link to="/examples/v4">Examples</Link>
      </Text>
    </>
  );

  return (
    <>
      <Topbar
        activeChapter={null}
        activeRoute={inDocs ? "docs" : "landing"}
        onToggleTheme={toggle}
      />
      {inDocs ? (
        <Container maxWidth={1440} px={{ base: 5, lg: 8 }}>
          <Grid data-part="docs-shell" gap={14} position="relative">
            <DocsSidebar />
            <Box as="main" minWidth={0} maxWidth={720} pt={9} pb={30}>
              {body}
            </Box>
          </Grid>
        </Container>
      ) : (
        <Container as="main" maxWidth={720} px={8} py={24}>
          {body}
        </Container>
      )}
    </>
  );
}
