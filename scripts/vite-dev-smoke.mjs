/**
 * Dev-server smoke for `styleGenVite` on whatever Vite major is installed
 * (CI `peer-matrix` legs). `vite build` never runs `configureServer`, so this
 * starts a real dev server on `examples/harness`, expects the plugin to write
 * `theme.css` in `buildStart` (Vite runs it from `listen()`, not from
 * `createServer()`), edits a colour in the theme JSON and expects it to
 * rewrite `theme.css` and send a full-reload. A second scenario checks that
 * `createServer()` without `listen()` plus an SSR transform also writes
 * `theme.css` (`perEnvironmentStartEndDuringDev`; Vite >= 6 only, Vite 5 has
 * no lazy `buildStart` and the scenario is skipped there). Both files are restored on
 * exit.
 *
 * Usage: node scripts/vite-dev-smoke.mjs
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createLogger, createServer, version } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exampleDir = join(root, "examples/harness");
// The theme lives in the shared design-system package; the app's plugin reads
// it through `package.json#style-gen.theme` and emits `theme.css` into the harness example.
const themeJson = join(root, "examples/design-system/src/theme.json");
const themeCss = join(exampleDir, "src/theme/theme.css");
const MARKER = "#0a1b2c";
const TIMEOUT_MS = 15_000;
const RETRY_MS = 1_000;
// The harness takes its config from `package.json#style-gen`; a
// `style-gen.config.json` created while the server runs takes precedence.
const configJson = join(exampleDir, "style-gen.config.json");

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
  rmSync(configJson, { force: true });
};
process.on("exit", restore);

// A leftover theme.css would make the buildStart checks below pass without the
// plugin writing anything; the original is restored on exit.
rmSync(themeCss, { force: true });

// Scenario 1: `createServer()` without `listen()` (SSR frameworks, test
// runners) then an SSR transform. Vite >= 6 skips a non-client environment's
// lazy `buildStart` in dev unless the plugin sets
// `perEnvironmentStartEndDuringDev`, which `styleGenVite` does. Vite 5 has no
// lazy `buildStart` (it runs only from `listen()` or in middleware mode), so
// the scenario cannot pass there and is skipped.
if (Number(version.split(".")[0]) >= 6) {
  const ssrServer = await createServer({
    root: exampleDir,
    configFile: join(exampleDir, "vite.config.ts"),
    logLevel: "warn",
    server: { hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    await ssrServer.transformRequest("/src/main.tsx", { ssr: true });
  } finally {
    await ssrServer.close();
  }
  if (
    !existsSync(themeCss) ||
    !readFileSync(themeCss, "utf8").includes("@theme inline")
  ) {
    fail(
      "createServer() + ssr transform (no listen) did not write theme.css: buildStart was skipped",
    );
  }
  rmSync(themeCss, { force: true });
} else {
  console.log(
    `- vite ${version}: scenario 1 (createServer without listen) skipped, Vite 5 has no lazy buildStart`,
  );
}

// Scenario 2: the regular dev server (below). A custom logger records every
// warning so the restart scenario can assert the duplicate-instance warning
// does not fire (Vite builds the new server, and resolves its plugins, before
// it closes the old one).
/** @type {string[]} */
const warnings = [];
const customLogger = createLogger("warn");
const loggerWarn = customLogger.warn;
customLogger.warn = (msg, options) => {
  warnings.push(msg);
  loggerWarn(msg, options);
};
const server = await createServer({
  root: exampleDir,
  configFile: join(exampleDir, "vite.config.ts"),
  customLogger,
  server: { hmr: false },
  optimizeDeps: { noDiscovery: true, include: [] },
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

// `buildStart` of the client environment runs inside `listen()`.
await server.listen();

if (
  !existsSync(themeCss) ||
  !readFileSync(themeCss, "utf8").includes("@theme inline")
) {
  await server.close();
  fail("buildStart did not write theme.css");
}

// Wait until the watcher lists theme.json. This is only a coarse gate: on
// macOS (FSEvents) `getWatched()` reports the file before its event stream
// exists, so an edit right after it can still be lost; `settle()` below
// therefore repeats every edit until its effect shows up. Do not gate on
// `ready` either: chokidar counts only the top-level paths Vite passes to
// `watch()`, so on Linux (fs.watch) `ready` fires once the root has been
// read, before nested dirs like `src/theme` are registered.
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
if (firstColor === undefined)
  fail("examples/design-system theme has no colors");
theme.colors[firstColor] = MARKER;
const editedTheme = `${JSON.stringify(theme, null, 2)}\n`;

/**
 * Run `edit`, then repeat it every `RETRY_MS` until `done()` holds. The
 * edits here are idempotent (the plugin emits write-if-changed), so a repeat
 * only gives a lost watcher event another chance to arrive.
 * @param {() => void} edit - The filesystem change under test
 * @param {() => boolean} done - Whether its effect is visible
 * @param {string} what - Failure message when the effect never shows up
 * @returns {Promise<void>} Resolves once `done()` holds
 */
const settle = async (edit, done, what) => {
  const begun = Date.now();
  let lastEdit = 0;
  while (!done()) {
    if (Date.now() - begun > TIMEOUT_MS) {
      await server.close();
      fail(`${what} within ${TIMEOUT_MS} ms`);
    }
    if (Date.now() - lastEdit >= RETRY_MS) {
      edit();
      lastEdit = Date.now();
    }
    await new Promise((r) => setTimeout(r, 100));
  }
};

await settle(
  () => {
    writeFileSync(themeJson, editedTheme);
  },
  () =>
    readFileSync(themeCss, "utf8").includes(MARKER) &&
    sent.includes("full-reload"),
  `no re-emit (ws messages: [${sent.join(", ")}])`,
);

// Scenario 3: the config moves from `package.json#style-gen` to a
// `style-gen.config.json` created while the server runs (N-L1).
const pkg = JSON.parse(readFileSync(join(exampleDir, "package.json"), "utf8"));
const reloadsBefore = sent.filter((t) => t === "full-reload").length;
const createdConfig = `${JSON.stringify({ ...pkg["style-gen"], resetTailwindDefaults: ["colors"] }, null, 2)}\n`;
await settle(
  () => {
    writeFileSync(configJson, createdConfig);
  },
  () =>
    readFileSync(themeCss, "utf8").includes("--color-*: initial;") &&
    sent.filter((t) => t === "full-reload").length > reloadsBefore,
  "creating style-gen.config.json next to package.json#style-gen was not picked up",
);

// Removing it falls back to `package.json#style-gen`. A removal that went
// unnoticed cannot be repeated on a missing file, so the repeat creates and
// removes it again (the last event is an unlink either way).
await settle(
  () => {
    if (!existsSync(configJson)) writeFileSync(configJson, createdConfig);
    rmSync(configJson, { force: true });
  },
  () => !readFileSync(themeCss, "utf8").includes("--color-*: initial;"),
  "removing style-gen.config.json did not fall back to package.json#style-gen",
);

await server.restart();
const duplicate = warnings.find((w) => w.includes("Multiple plugin instances"));
if (duplicate !== undefined) {
  await server.close();
  fail(
    `server.restart() logged a false duplicate-instance warning: ${duplicate}`,
  );
}

await server.close();
console.log(
  `✓ vite ${version} dev server: theme.json edit re-emitted theme.css and sent full-reload; server.restart() raised no duplicate-instance warning`,
);
