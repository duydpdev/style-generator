export type Lang = "json" | "css" | "ts" | "text";

const KW =
  "import|from|const|let|var|function|type|interface|export|default|return|if|else|true|false|null|new|async|await|class";

const RE = {
  json: /(\/\/[^\n]*)|("(?:\\.|[^"\\])*")|(-?\d+\.?\d*)|(\btrue\b|\bfalse\b|\bnull\b)/g,
  css: /(\/\*[\s\S]*?\*\/)|(--[a-z0-9-]+)|(#[0-9a-f]{3,8})\b|(@[a-z-]+)|("(?:\\.|[^"\\])*")/gi,
  ts: new RegExp(
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
    return escaped.replace(RE.json, (_m, c, str, num, lit) => {
      if (c) return `<span class="tok-c">${c}</span>`;
      if (str) return `<span class="tok-s">${str}</span>`;
      if (num) return `<span class="tok-n">${num}</span>`;
      if (lit) return `<span class="tok-n">${lit}</span>`;
      return _m;
    });
  }

  if (lang === "css") {
    return escaped.replace(RE.css, (_m, c, v, hex, at, str) => {
      if (c) return `<span class="tok-c">${c}</span>`;
      if (v) return `<span class="tok-k">${v}</span>`;
      if (hex) return `<span class="tok-s">${hex}</span>`;
      if (at) return `<span class="tok-n">${at}</span>`;
      if (str) return `<span class="tok-s">${str}</span>`;
      return _m;
    });
  }

  if (lang === "ts") {
    return escaped.replace(RE.ts, (_m, mc, lc, dq, tpl, kw, type, num) => {
      if (mc) return `<span class="tok-c">${mc}</span>`;
      if (lc) return `<span class="tok-c">${lc}</span>`;
      if (dq) return `<span class="tok-s">${dq}</span>`;
      if (tpl) return `<span class="tok-s">${tpl}</span>`;
      if (kw) return `<span class="tok-n">${kw}</span>`;
      if (type) return `<span class="tok-t">${type}</span>`;
      if (num) return `<span class="tok-n">${num}</span>`;
      return _m;
    });
  }

  return escaped;
}
