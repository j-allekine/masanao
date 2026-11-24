import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const cli = join(dirname(require.resolve("@playwright/test/package.json")), "cli.js");
const args = process.argv.slice(2);
const run = (suiteArgs, options = {}) => spawnSync(process.execPath, [cli, "test", ...suiteArgs], {
  stdio: "inherit",
  windowsHide: true,
  ...options,
});
const status = result => {
  if (result.error) console.error(result.error.message);
  return result.status ?? 1;
};

// Keep explicitly selected configs and CLI help behaving like Playwright itself.
if (args.some(arg => /^(--config(?:=|$)|-c$|--help$|-h$|--version$|-V$)/.test(arg))) {
  process.exit(status(run(args)));
}

const configs = ["playwright.config.ts", "playwright.opening-stock.config.ts"];
const testCount = suite => (suite.specs ?? []).reduce((count, spec) => count + spec.tests.length, 0)
  + (suite.suites ?? []).reduce((count, child) => count + testCount(child), 0);
const selected = [];
const databasePath = process.env.MASANAO_E2E_DATABASE_PATH?.trim();
const runSuite = (config, suiteArgs, options = {}) => run(["--config", config, ...suiteArgs], {
  ...options,
  // An explicit database override must not reconnect both suites to one ledger.
  env: { ...process.env, ...(databasePath ? { MASANAO_E2E_DATABASE_PATH: `${databasePath}.${config === configs[0] ? "general" : "opening-stock"}.db` } : {}) },
});
for (const config of configs) {
  // Discover first so a file/grep filter matching only one suite does not cause
  // the other suite to fail, while a filter matching nothing still exits 1.
  const result = runSuite(config, [...args, "--list", "--reporter=json", "--pass-with-no-tests"], {
    stdio: ["ignore", "pipe", "inherit"],
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (status(result) !== 0) {
    if (result.stdout) process.stderr.write(result.stdout);
    process.exit(status(result));
  }
  const report = JSON.parse(result.stdout);
  if (testCount(report) > 0) selected.push(config);
}
if (!selected.length) {
  console.error("No tests found in the general or Opening Stock browser suite.");
  process.exit(args.includes("--pass-with-no-tests") ? 0 : 1);
}
for (const config of selected) {
  const result = runSuite(config, args);
  if (status(result) !== 0) process.exit(status(result));
}
