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

      <div className="compare-wrap" data-reveal="up">
        <table className="compare">
          <thead>
            <tr>
              <th style={{ width: "26%" }}>Capability</th>
              <th className="col-tw" style={{ width: "37%" }}>
                Bare Tailwind<small>v4</small>
              </th>
              <th className="col-us" style={{ width: "37%" }}>
                + style-generator<small>v{VERSION}</small>
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((r) => (
              <tr key={r.label}>
                <td className="row-label">{r.label}</td>
                <td className="cell-tw">{r.tw}</td>
                <td className="cell-us">{r.us}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Box>
  );
}
