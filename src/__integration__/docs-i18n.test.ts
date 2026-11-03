import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "..", "..");
const FENCE = "```";

/**
 * Write `content` to `<root>/<rel>`, creating parent directories.
 * @param {string} root - Fixture root
 * @param {string} rel - Root-relative file path
 * @param {string} content - File contents
 */
function put(root: string, rel: string, content: string) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), content);
}

/**
 * Run a docs script in place against a fixture tree.
 * @param {string} script - Repo-relative script path
 * @param {string} dir - Fixture root, passed as `--root`
 * @param {string[]} args - Arguments before `--root`
 * @returns {{ status: number | null, output: string }} Exit code and combined output
 */
function run(script: string, dir: string, args: string[] = []) {
  const result = spawnSync(
    process.execPath,
    [join(repoRoot, script), ...args, "--root", dir],
    { encoding: "utf8" },
  );
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

/**
 * Create a fresh temp dir before each test and remove it afterwards.
 * @returns {{ dir: string }} State object whose `dir` is set while a test runs
 */
function useTempDir() {
  const state = { dir: "" };
  beforeEach(() => {
    state.dir = mkdtempSync(join(tmpdir(), "style-gen-i18n-"));
  });
  afterEach(() => {
    rmSync(state.dir, { recursive: true, force: true });
  });
  return state;
}

const i18n = (dir: string, args: string[] = []) =>
  run("scripts/check-docs-i18n.mjs", dir, args);

const EN_GUIDE = [
  "# Guide",
  "",
  "Intro sentence for the guide page with enough words.",
  "",
  "## Usage `generate`",
  "",
  "<!-- embed: examples/a.ts#one -->",
  "",
  `${FENCE}ts`,
  "const a = 1;",
  FENCE,
  "",
  "> [!NOTE]",
  "> Keep it.",
  "",
  "<!-- signature: f -->",
  "",
  `${FENCE}ts`,
  "declare function f(): void;",
  FENCE,
  "",
  "Calls f.",
  "<!-- /signature -->",
  "",
].join("\n");

const VI_GUIDE = [
  "# Hướng dẫn",
  "",
  "Câu giới thiệu cho trang hướng dẫn.",
  "",
  "## Cách dùng `generate`",
  "",
  "<!-- embed: examples/a.ts#one -->",
  "",
  `${FENCE}ts`,
  "const a = 1;",
  FENCE,
  "",
  "> [!NOTE]",
  "> Giữ nguyên.",
  "",
  "<!-- signature: f -->",
  "",
  `${FENCE}ts`,
  "declare function f(): void;",
  FENCE,
  "",
  "Calls f.",
  "<!-- /signature -->",
  "",
].join("\n");

/**
 * Two rendered docs and their twins, hashes recorded.
 * @param {string} dir - Fixture root
 */
function mirrored(dir: string) {
  put(
    dir,
    "site/src/lib/docs-meta.json",
    JSON.stringify({
      "README.md": {
        slug: "introduction",
        title: "Introduction",
        group: "Start",
        order: 1,
        vi: { title: "Giới thiệu" },
      },
      "documents/guide.md": {
        slug: "guide",
        title: "Guide",
        group: "Guides",
        order: 1,
        vi: { title: "Hướng dẫn" },
      },
    }),
  );
  put(
    dir,
    "README.md",
    "# Intro\n\nHello world from the package readme file.\n",
  );
  put(dir, "documents/guide.md", EN_GUIDE);
  put(dir, "documents/vi/README.md", "# Giới thiệu\n\nXin chào.\n");
  put(dir, "documents/vi/guide.md", VI_GUIDE);
  const written = i18n(dir, [
    "--write-hash",
    "documents/vi/README.md",
    "--write-hash",
    "documents/vi/guide.md",
  ]);
  expect(written.status).toBe(0);
}

/**
 * Replace the twin's body, keeping its recorded source line.
 * @param {string} dir - Fixture root
 * @param {string} body - New Vietnamese text after line 2
 */
function rewriteVi(dir: string, body: string) {
  const file = join(dir, "documents/vi/guide.md");
  const [source = ""] = readFileSync(file, "utf8").split("\n");
  writeFileSync(file, `${source}\n\n${body}`);
}

describe("integration: check-docs-i18n", { timeout: 60_000 }, () => {
  const t = useTempDir();

  it("passes once --write-hash recorded the source hash", () => {
    mirrored(t.dir);
    expect(readFileSync(join(t.dir, "documents/vi/guide.md"), "utf8")).toMatch(
      /^<!-- source: documents\/guide\.md sha256: [0-9a-f]{12} -->\n\n# Hướng dẫn/,
    );
    const result = i18n(t.dir);
    expect(result.status).toBe(0);
    expect(result.output).toContain("2 Vietnamese twins match");
  });

  it("fails on a missing twin", () => {
    mirrored(t.dir);
    rmSync(join(t.dir, "documents/vi/README.md"));
    const result = i18n(t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("documents/vi/README.md: missing");
  });

  it("fails when the English file changed after the translation", () => {
    mirrored(t.dir);
    put(t.dir, "documents/guide.md", `${EN_GUIDE}One more English sentence.\n`);
    const stale = i18n(t.dir);
    expect(stale.status).toBe(1);
    expect(stale.output).toContain("changed since it was translated");
  });

  it("hashes CRLF and LF checkouts alike", () => {
    mirrored(t.dir);
    put(t.dir, "documents/guide.md", EN_GUIDE.replace(/\n/g, "\r\n"));
    expect(i18n(t.dir).status).toBe(0);
  });

  it("fails on a heading level mismatch", () => {
    mirrored(t.dir);
    rewriteVi(t.dir, VI_GUIDE.replace("## Cách dùng", "### Cách dùng"));
    const result = i18n(t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("heading 2");
  });

  it("fails when a heading drops its inline code", () => {
    mirrored(t.dir);
    rewriteVi(
      t.dir,
      VI_GUIDE.replace("## Cách dùng `generate`", "## Cách dùng"),
    );
    const result = i18n(t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("heading 2");
  });

  it("fails on a missing marker", () => {
    mirrored(t.dir);
    rewriteVi(
      t.dir,
      VI_GUIDE.replace("<!-- embed: examples/a.ts#one -->\n\n", ""),
    );
    const result = i18n(t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("marker 1");
  });

  it("fails when a code block was changed", () => {
    mirrored(t.dir);
    rewriteVi(t.dir, VI_GUIDE.replace("const a = 1;", "const a = 2;"));
    const result = i18n(t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("code block 1");
  });

  it("fails when a signature block was translated", () => {
    mirrored(t.dir);
    rewriteVi(t.dir, VI_GUIDE.replace("Calls f.", "Gọi f."));
    const result = i18n(t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("signature block 1");
  });

  it("fails on a twin that is not NFC", () => {
    mirrored(t.dir);
    rewriteVi(t.dir, VI_GUIDE.normalize("NFD"));
    const result = i18n(t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("not Unicode NFC");
  });

  it("fails on a Vietnamese file without an English source", () => {
    mirrored(t.dir);
    put(t.dir, "documents/vi/extra.md", "# Thêm\n");
    const result = i18n(t.dir);
    expect(result.status).toBe(1);
    expect(result.output).toContain("documents/vi/extra.md: no English source");
  });

  it("--only limits the check and rejects a path that selects nothing", () => {
    mirrored(t.dir);
    put(t.dir, "documents/guide.md", `${EN_GUIDE}One more English sentence.\n`);
    expect(i18n(t.dir, ["--only", "documents/vi/README.md"]).status).toBe(0);
    expect(i18n(t.dir, ["--only", "documents/vi/nope"]).status).toBe(2);
  });

  it("--untranslated reports prose copied from the English file", () => {
    mirrored(t.dir);
    rewriteVi(
      t.dir,
      VI_GUIDE.replace(
        "Câu giới thiệu cho trang hướng dẫn.",
        "Intro sentence for the guide page with enough words.",
      ),
    );
    expect(i18n(t.dir).status).toBe(0);
    const strict = i18n(t.dir, ["--untranslated"]);
    expect(strict.status).toBe(1);
    expect(strict.output).toContain("untranslated line");
  });

  it("exits 2 on an unknown argument", () => {
    mirrored(t.dir);
    const result = i18n(t.dir, ["--bogus"]);
    expect(result.status).toBe(2);
    expect(result.output).toContain("usage: check-docs-i18n.mjs");
  });
});

/**
 * The smallest tree check-doc-links accepts: every directory and file its
 * EN_DOC_FILES list reads, each with a docs-meta entry.
 * @param {string} dir - Fixture root
 * @param {boolean} withVi - Whether to also write the two twins
 */
function linkTree(dir: string, withVi: boolean) {
  const entry = (slug: string, group: string, order: number) => ({
    slug,
    title: slug,
    group,
    order,
    vi: { title: `vi ${slug}` },
  });
  put(
    dir,
    "site/src/lib/docs-meta.json",
    JSON.stringify({
      "README.md": entry("introduction", "Start", 1),
      "documents/migration/4.x-to-5.0.md": entry("m5", "Migration", 1),
      "documents/migration/3.x-to-4.0.md": entry("m4", "Migration", 2),
      "documents/guide.md": entry("guide", "Guides", 1),
      "documents/getting-started/a.md": entry("start-a", "Start", 2),
      "documents/reference/core.md": entry("core", "Reference", 1),
    }),
  );
  put(
    dir,
    "README.md",
    "# Intro\n\n## Install\n\nSee [guide](documents/guide.md#usage).\n",
  );
  put(
    dir,
    "documents/guide.md",
    "# Guide\n\n## Usage\n\nBack to [intro](../README.md#install).\n",
  );
  put(dir, "documents/getting-started/a.md", "# A\n");
  put(dir, "documents/reference/core.md", "# Core\n");
  put(dir, "documents/migration/4.x-to-5.0.md", "# M5\n");
  put(dir, "documents/migration/3.x-to-4.0.md", "# M4\n");
  if (!withVi) return;
  put(
    dir,
    "documents/vi/README.md",
    "# Giới thiệu\n\n## Cài đặt\n\nXem [hướng dẫn](guide.md#cách-dùng).\n",
  );
  put(
    dir,
    "documents/vi/guide.md",
    "# Hướng dẫn\n\n## Cách dùng\n\nVề [giới thiệu](./README.md#cài-đặt).\n",
  );
}

describe(
  "integration: check-doc-links (Vietnamese twins)",
  { timeout: 60_000 },
  () => {
    const t = useTempDir();
    const links = (dir: string) => run("site/scripts/check-doc-links.mjs", dir);

    it("accepts twins that link each other with Vietnamese anchors", () => {
      linkTree(t.dir, true);
      const result = links(t.dir);
      expect(result.status).toBe(0);
      expect(result.output).toContain("(2 Vietnamese)");
    });

    it("leaves a missing twin to check:docs-i18n", () => {
      linkTree(t.dir, false);
      expect(links(t.dir).status).toBe(0);
    });

    it("rejects a link from a twin to an English doc", () => {
      linkTree(t.dir, true);
      put(
        t.dir,
        "documents/vi/guide.md",
        "# Hướng dẫn\n\n## Cách dùng\n\nVề [giới thiệu](../../README.md#install).\n",
      );
      const result = links(t.dir);
      expect(result.status).toBe(1);
      expect(result.output).toContain("is an English doc");
    });

    it("checks anchors inside the twins", () => {
      linkTree(t.dir, true);
      put(
        t.dir,
        "documents/vi/guide.md",
        "# Hướng dẫn\n\n## Cách dùng\n\nVề [giới thiệu](./README.md#install).\n",
      );
      const result = links(t.dir);
      expect(result.status).toBe(1);
      expect(result.output).toContain('no heading "#install"');
    });

    it("requires a vi.title on every docs-meta entry", () => {
      linkTree(t.dir, true);
      const metaFile = join(t.dir, "site/src/lib/docs-meta.json");
      const meta = JSON.parse(readFileSync(metaFile, "utf8")) as Record<
        string,
        { vi?: unknown }
      >;
      const guide = meta["documents/guide.md"];
      if (guide) delete guide.vi;
      writeFileSync(metaFile, JSON.stringify(meta));
      const result = links(t.dir);
      expect(result.status).toBe(1);
      expect(result.output).toContain("no vi.title for documents/guide.md");
    });
  },
);
