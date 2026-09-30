import { useMemo } from "react";

import { tokenize, type Lang } from "../lib/tokenize";

interface Props {
  filename: string;
  tag?: string;
  lang: Lang;
  code: string;
}

/**
 *
 * @param root0
 * @param root0.filename
 * @param root0.tag
 * @param root0.lang
 * @param root0.code
 */
export function CodeCard({ filename, tag, lang, code }: Props) {
  const html = useMemo(() => tokenize(code, lang), [code, lang]);

  return (
    <div className="code-card">
      <div className="code-head">
        <span className="dots">
          <span />
          <span />
          <span />
        </span>
        <span className="filename">{filename}</span>
        {tag ? <span className="tag">{tag}</span> : null}
      </div>
      <div className="code-body">
        <pre dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
