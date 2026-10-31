import { ChapterHead } from "../components/chapter-head";
import { Box } from "../ui";
import { VERSION } from "../data/version";

import { COMPARE_ROWS } from "./compare-rows";

/**
 *
 */
export function CompareSection() {
  return (
    <Box
      as="section"
      id="compare"
      data-ch="02"
      data-ch-label="Side by side"
      pt={14}
      pb={2}
      mt={6}
    >
      <ChapterHead
        num="02"
        label="Side by side"
        title={
          <>
            Bare Tailwind <em>vs</em> style-generator.
          </>
        }
        lede={
          <>
            Same problems, different ergonomics. style-generator doesn't replace
            Tailwind — it absorbs the repetitive plumbing on top of it.
          </>
        }
      />

      <Box data-part="compare-wrap" data-reveal="up" rounded="lg">
        <table data-part="compare">
          <thead>
            <tr>
              <Box as="th" px={5} py={4} style={{ width: "26%" }}>
                Capability
              </Box>
              <Box
                as="th"
                data-part="col-tw"
                px={5}
                py={4}
                style={{ width: "37%" }}
              >
                Bare Tailwind
                <Box as="small" mt={0.75}>
                  v4
                </Box>
              </Box>
              <Box
                as="th"
                data-part="col-us"
                px={5}
                py={4}
                style={{ width: "37%" }}
              >
                + style-generator
                <Box as="small" mt={0.75}>
                  v{VERSION}
                </Box>
              </Box>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((r) => (
              <tr key={r.label}>
                <Box as="td" data-part="row-label" px={5} py={3.5}>
                  {r.label}
                </Box>
                <Box as="td" data-part="cell-tw" px={5} py={3.5}>
                  {r.tw}
                </Box>
                <Box as="td" data-part="cell-us" px={5} py={3.5}>
                  {r.us}
                </Box>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Box>
  );
}
