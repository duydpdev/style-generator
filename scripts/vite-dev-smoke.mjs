/**
 * Dev-server smoke for `styleGenVite` on whatever Vite major is installed
 * (CI `peer-matrix` legs). `vite build` never runs `configureServer`, so this
 * starts a real dev server on `examples/react-v4`, edits a colour in the
 * theme JSON and expects the plugin to rewrite `theme.css` and send a
 * full-reload. Both files are restored on exit.
 *
 * Usage: node scripts/vite-dev-smoke.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createServer, version } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exampleDir = join(root, "examples/react-v4");
const themeJson = join(exampleDir, "src/theme/theme.json");
const themeCss = join(exampleDir, "src/theme/theme.css");
const MARKER = "#0a1b2c";
const TIMEOUT_MS = 15_000;

/**
 * Print the reason and exit 1.
 * @param {string} message - What went wrong
 * @returns {never} Never returns
 */
const fail = (message) => {
  console.error(`✗ vite ${version} dev smoke: ${message}`);
  process.exit(1);
};

const originalJson = readFileSync(themeJson, "utf8");
const originalCss = existsSync(themeCss)
  ? readFileSync(themeCss, "utf8")
  : null;
const restore = () => {
  writeFileSync(themeJson, originalJson);
  if (originalCss !== null) writeFileSync(themeCss, originalCss);
};
process.on("exit", restore);

const server = await createServer({
  root: exampleDir,
  configFile: join(exampleDir, "vite.config.ts"),
  logLevel: "warn",
  server: { hmr: false },
});

/** @type {string[]} */
const sent = [];
const send = server.ws.send;
server.ws.send = /** @type {typeof send} */ (
  /**
   * Record the type of every payload, then forward it.
   * @param {...unknown} args - `send` arguments (payload object or event name)
   * @returns {void}
   */
  (...args) => {
    const [payload] = args;
    if (typeof payload === "object" && payload !== null && "type" in payload) {
      sent.push(String(payload.type));
    }
    Reflect.apply(send, server.ws, args);
  }
);

if (!readFileSync(themeCss, "utf8").includes("@theme inline")) {
  await server.close();
  fail("configResolved did not write theme.css");
}

// Wait until the watcher actually watches theme.json; an edit before that
// produces no `change`. Do not gate on `ready`: chokidar counts only the
// top-level paths Vite passes to `watch()`, so on Linux (fs.watch) `ready`
// fires once the root has been read, before nested dirs like `src/theme` are
// registered. macOS (fsevents) watches recursively, which hid this locally.
const WATCH_TIMEOUT_MS = 10_000;
const themeDir = dirname(themeJson);
const watchStarted = Date.now();
while (
  !(server.watcher.getWatched()[themeDir] ?? []).includes(basename(themeJson))
) {
  if (Date.now() - watchStarted > WATCH_TIMEOUT_MS) {
    const watched = Object.keys(server.watcher.getWatched());
    await server.close();
    fail(
      `watcher did not pick up ${themeJson} within ${WATCH_TIMEOUT_MS} ms (watched dirs: ${watched.join(", ")})`,
    );
  }
  await new Promise((r) => setTimeout(r, 50));
}

const theme = JSON.parse(originalJson);
const [firstColor] = Object.keys(theme.colors);
if (firstColor === undefined) fail("examples/react-v4 theme has no colors");
theme.colors[firstColor] = MARKER;
writeFileSync(themeJson, `${JSON.stringify(theme, null, 2)}\n`);

const started = Date.now();
while (
  !(
    readFileSync(themeCss, "utf8").includes(MARKER) &&
    sent.includes("full-reload")
  )
) {
  if (Date.now() - started > TIMEOUT_MS) {
    await server.close();
    fail(
      `no re-emit within ${TIMEOUT_MS} ms (theme.css has marker: ${String(
        readFileSync(themeCss, "utf8").includes(MARKER),
      )}, ws messages: [${sent.join(", ")}])`,
    );
  }
  await new Promise((r) => setTimeout(r, 100));
}

await server.close();
console.log(
  `✓ vite ${version} dev server: theme.json edit re-emitted theme.css and sent full-reload`,
);
