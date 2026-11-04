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

      <Box className="s-compare-wrap" data-reveal="up" rounded="lg">
        <table className="s-compare">
          <thead>
            <tr>
              <Box as="th" px={5} py={4} width="26%">
                Capability
              </Box>
              <Box as="th" className="s-col-tw" px={5} py={4} width="37%">
                Bare Tailwind
                <Box as="small" mt={0.75}>
                  v4
                </Box>
              </Box>
              <Box as="th" className="s-col-us" px={5} py={4} width="37%">
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
                <Box as="td" className="s-row-label" px={5} py={3.5}>
                  {r.label}
                </Box>
                <Box as="td" className="s-cell-tw" px={5} py={3.5}>
                  {r.tw}
                </Box>
                <Box as="td" className="s-cell-us" px={5} py={3.5}>
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
