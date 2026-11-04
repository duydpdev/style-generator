import { Link } from "react-router-dom";

import { DocsSidebar } from "../components/docs-sidebar";
import { Topbar } from "../components/topbar";
import { docsOf } from "../lib/docs-content";
import { docPath, UI_TEXT } from "../lib/locale";
import { useLocale } from "../lib/use-locale";
import { useTheme } from "../lib/use-theme";
import { Box, Grid, Text } from "../ui";

interface Props {
  /** Slug of the doc that was requested, when the miss happened under `/docs`. */
  missingDoc?: string;
}

export function NotFound({ missingDoc }: Readonly<Props>) {
  const { toggle } = useTheme();
  const locale = useLocale();
  const t = UI_TEXT[locale];
  const inDocs = missingDoc !== undefined;

  const body = (
    <>
      <Text as="h1">{t.notFound}</Text>
      <Text as="p">
        {inDocs ? (
          <>
            {t.docWord} <code>{missingDoc}</code> {t.doesNotExist}
          </>
        ) : (
          t.pageMissing
        )}
      </Text>
      <Text as="p">
        <Link to="/">{t.landingPage}</Link> ·{" "}
        <Link to={docPath(locale, docsOf(locale)[0]?.slug ?? "introduction")}>
          {t.docs}
        </Link>{" "}
        · <Link to="/examples/v4">{t.examples}</Link>
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
        <Box className="s-container" maxWidth={1440} px={{ base: 5, lg: 8 }}>
          <Grid className="s-docs-shell" gap={14} position="relative">
            <DocsSidebar />
            <Box as="main" minWidth={0} maxWidth={720} pt={9} pb={30}>
              {body}
            </Box>
          </Grid>
        </Box>
      ) : (
        <Box as="main" className="s-container" maxWidth={720} px={8} py={24}>
          {body}
        </Box>
      )}
    </>
  );
}
