import { VERSION } from "../data/version";
import { COMPARE_ROWS } from "./compare-rows";

/**
 *
 */
export function CompareSection() {
  return (
    <section
      id="compare"
      className="chapter"
      data-ch="02"
      data-ch-label="Side by side"
    >
      <div className="ch-marker">02</div>
      <div className="ch-eyebrow">
        <span>
          Ch. <b>02</b>
        </span>
        <span>· Side by side</span>
      </div>
      <h2 className="ch-title">
        Bare Tailwind <em>vs</em> style-generator.
      </h2>
      <p className="ch-lede">
        Same problems, different ergonomics. style-generator doesn't replace
        Tailwind — it absorbs the repetitive plumbing on top of it.
      </p>

      <div className="compare-wrap reveal">
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
    </section>
  );
}
