export type Lang = "json" | "css" | "ts" | "text";

const KW =
  "import|from|const|let|var|function|type|interface|export|default|return|if|else|true|false|null|new|async|await|class";

const RE = {
  // eslint-disable-next-line sonarjs/regex-complexity -- tokenizer grammar is one alternation per token class; splitting it would change match precedence/highlighting
  json: /(\/\/[^\n]*)|("(?:\\.|[^"\\])*")|(-?\d+\.?\d*)|(\btrue\b|\bfalse\b|\bnull\b)/g,
  // eslint-disable-next-line sonarjs/regex-complexity -- tokenizer grammar is one alternation per token class; splitting it would change match precedence/highlighting
  css: /(\/\*[\s\S]*?\*\/)|(--[a-z0-9-]+)|(#[0-9a-f]{3,8})\b|(@[a-z-]+)|("(?:\\.|[^"\\])*")/gi,
  ts: new RegExp(
    // eslint-disable-next-line sonarjs/regex-complexity, sonarjs/slow-regex -- same single-pass alternation as json/css; input is the site's own static snippets, and the lazy block-comment match is bounded by the closing delimiter
    "(\\/\\*[\\s\\S]*?\\*\\/)" +
      "|(\\/\\/[^\\n]*)" +
      '|("(?:\\\\.|[^"\\\\])*")' +
      "|(`(?:\\\\.|[^`\\\\])*`)" +
      "|(\\b(?:" +
      KW +
      ")\\b)" +
      "|(\\b[A-Z][A-Za-z0-9]+\\b)" +
      "|(-?\\b\\d+\\.?\\d*\\b)",
    "g",
  ),
};

/**
 *
 * @param s
 */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 *
 * @param src
 * @param lang
 */
export function tokenize(src: string, lang: Lang): string {
  const escaped = esc(src);

  if (lang === "json") {
    return escaped.replace(
      RE.json,
      (_m: string, c?: string, str?: string, num?: string, lit?: string) => {
        if (c) return `<span class="tok-c">${c}</span>`;
        if (str) return `<span class="tok-s">${str}</span>`;
        if (num) return `<span class="tok-n">${num}</span>`;
        if (lit) return `<span class="tok-n">${lit}</span>`;
        return _m;
      },
    );
  }

  if (lang === "css") {
    return escaped.replace(
      RE.css,
      (
        _m: string,
        c?: string,
        v?: string,
        hex?: string,
        at?: string,
        str?: string,
      ) => {
        if (c) return `<span class="tok-c">${c}</span>`;
        if (v) return `<span class="tok-k">${v}</span>`;
        if (hex) return `<span class="tok-s">${hex}</span>`;
        if (at) return `<span class="tok-n">${at}</span>`;
        if (str) return `<span class="tok-s">${str}</span>`;
        return _m;
      },
    );
  }

  if (lang === "ts") {
    return escaped.replace(
      RE.ts,
      (
        _m: string,
        mc?: string,
        lc?: string,
        dq?: string,
        tpl?: string,
        kw?: string,
        type?: string,
        num?: string,
      ) => {
        if (mc) return `<span class="tok-c">${mc}</span>`;
        if (lc) return `<span class="tok-c">${lc}</span>`;
        if (dq) return `<span class="tok-s">${dq}</span>`;
        if (tpl) return `<span class="tok-s">${tpl}</span>`;
        if (kw) return `<span class="tok-n">${kw}</span>`;
        if (type) return `<span class="tok-t">${type}</span>`;
        if (num) return `<span class="tok-n">${num}</span>`;
        return _m;
      },
    );
  }

  return escaped;
}
