import { runCli } from "./run";

// The exit code is set, not exited with: stdout/stderr flush and `--watch`
// keeps the process alive until its handle closes.
process.exitCode = await runCli(process.argv.slice(2), process.cwd());
