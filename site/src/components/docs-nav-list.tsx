import type { MouseEvent } from "react";
import { NavLink } from "react-router-dom";

import { groupedDocs } from "../lib/docs-content";
import { Box, Stack, Text } from "../ui";

interface Props {
  activeSlug?: string;
  onNavigate?: (e: MouseEvent<HTMLAnchorElement>) => void;
}

/** The grouped, numbered page list shared by the left rail and the mobile switcher. */
export function DocsNavGroups({ activeSlug, onNavigate }: Readonly<Props>) {
  let counter = 0;

  return (
    <>
      {groupedDocs().map((g) => (
        <Stack key={g.group} gap={0.25}>
          <Text
            as="div"
            data-part="docnav-heading"
            color="muted"
            pt={3}
            px={2}
            pb={1.5}
          >
            {g.group}
          </Text>
          {g.docs.map((d) => {
            counter += 1;
            const num = String(counter).padStart(2, "0");
            return (
              <NavLink
                key={d.slug}
                to={`/docs/${d.slug}`}
                className={`docnav-item${d.slug === activeSlug ? " active" : ""}`}
                onClick={onNavigate}
              >
                <Box as="span" data-part="num">
                  {num}
                </Box>
                <Box as="span">{d.title}</Box>
                {d.badge ? (
                  <Box
                    as="span"
                    data-part="doc-badge"
                    px={1.5}
                    py={0.25}
                    rounded="pill"
                    backgroundColor="primarySoft"
                  >
                    {d.badge}
                  </Box>
                ) : null}
              </NavLink>
            );
          })}
        </Stack>
      ))}
    </>
  );
}
