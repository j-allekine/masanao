import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rename, rmdir, stat, symlink, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const installer = resolve(process.argv[2]);
const previousInstaller = process.argv[3] ? resolve(process.argv[3]) : installer;
const registryKey = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{04D0DD84-C47A-42C0-BE6D-F134E2AD10D7}_is1";
const existing = spawnSync("reg.exe", ["query", registryKey, "/reg:64"], { windowsHide: true });
assert.ifError(existing.error);
assert.equal(existing.status, 1, "Use a Windows profile without an existing Masanao installation");
const temp = await mkdtemp(join(tmpdir(), "masanao-installer-test-"));
const app = join(temp, "Program Files", "Masanao");
const localAppData = join(temp, "Local AppData");
const systemRoot = process.env.SystemRoot;
const env = {
  ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH")),
  PATH: `${join(systemRoot, "System32")};${systemRoot}`,
  LOCALAPPDATA: localAppData,
  NODE_USE_ENV_PROXY: "1",
  HTTP_PROXY: "http://127.0.0.1:9",
  HTTPS_PROXY: "http://127.0.0.1:9",
  NO_PROXY: "localhost,127.0.0.1,::1",
};
const data = join(localAppData, "Masanao", "Data");
const node = join(app, "node.exe");
const launcher = join(app, "scripts", "windows", "launcher.mjs");
const url = "http://localhost:3000";
const silentOptions = ["/VERYSILENT", "/SUPPRESSMSGBOXES", "/NORESTART"];
const setupOptions = [...silentOptions, "/NOICONS", "/MERGETASKS=!desktopicon"];
const testCredentials = { username: "installer.test", password: randomBytes(16).toString("hex") };
const staffCredentials = { username: "installer.staff", password: randomBytes(16).toString("hex") };

function start(executable, args, input) {
  const child = spawn(executable, args, {
    env, windowsHide: true, stdio: [input ? "pipe" : "ignore", "inherit", "inherit"],
  });
  if (input) child.stdin.end(input);
  return { child, done: once(child, "exit").then(([code]) => code) };
}

async function run(executable, args, input) {
  assert.equal(await start(executable, args, input).done, 0, `${executable} failed`);
}

async function verifyInstallDestination() {
  const unrelated = join(temp, "unrelated project");
  const sentinel = join(unrelated, "public", "keep.txt");
  await mkdir(join(unrelated, "public"), { recursive: true });
  await writeFile(sentinel, "preserve existing files");
  const wrongFolder = await start(installer, [...setupOptions, `/DIR=${unrelated}`, `/LOG=${join(temp, "wrong-folder.log")}`]).done;
  assert.notEqual(wrongFolder, 0, "Setup accepted an unrelated install folder");
  assert.equal(await readFile(sentinel, "utf8"), "preserve existing files");

  const empty = join(temp, "empty folder");
  const junction = join(temp, "directory junction");
  await mkdir(empty);
  await symlink(empty, junction, "junction");
  const redirect = await start(installer, [...setupOptions, `/DIR=${junction}`, `/LOG=${join(temp, "junction.log")}`]).done;
  assert.notEqual(redirect, 0, "Setup accepted an install folder redirected through a junction");
  assert.deepEqual(await readdir(empty), [], "Setup wrote through a directory junction");
}

async function verifyPortConflict(host) {
  const otherApp = createServer();
  otherApp.listen(3000, host);
  try {
    await once(otherApp, "listening");
  } catch (error) {
    if (host === "::1" && ["EAFNOSUPPORT", "EADDRNOTAVAIL"].includes(error.code)) return false;
    throw error;
  }
  try {
    assert.equal(await start(node, [launcher, "start-test"]).done, 1, `Launch accepted a busy port on ${host}`);
  } finally {
    await new Promise((resolveClose) => otherApp.close(resolveClose));
  }
  return true;
}

async function verifyLogin(server, credentials = testCredentials) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const page = await fetch(`${url}/login`, { signal: AbortSignal.timeout(2_000) }).catch(() => null);
    if (page) {
      assert.equal(page.status, 200, "Installed login page failed");
      break;
    }
    if (server.child.exitCode !== null || attempt === 119) throw new Error("Installed app did not start.");
    await delay(500);
  }
  const login = await fetch(`${url}/api/auth/sign-in/username`, {
    method: "POST",
    headers: { origin: url, "content-type": "application/json" },
    body: JSON.stringify(credentials),
  });
  assert.equal(login.status, 200, `Sign-in failed with HTTP ${login.status}`);
  const cookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  assert.ok(cookie, "Sign-in did not set a session cookie");
  const workspace = await fetch(`${url}/dashboard`, { headers: { cookie }, redirect: "manual" });
  assert.equal(workspace.status, 200, "Authenticated production route failed");
  return cookie;
}

async function findUninstaller() {
  const file = (await readdir(app)).find((name) => /^unins\d+\.exe$/i.test(name));
  assert.ok(file, "Installer did not create an uninstaller");
  return join(app, file);
}

async function verifyBrowser(createRecord) {
  if (process.env.MASANAO_VERIFY_BROWSER !== "1") return;
  const { chromium, expect } = await import("@playwright/test");
  const browser = await chromium.launch();
  const blocked = [];
  try {
    const context = await browser.newContext({ serviceWorkers: "block" });
    await context.route("**/*", (route) => {
      const target = new URL(route.request().url());
      if (target.origin === url) return route.continue();
      blocked.push(target.origin);
      return route.abort("internetdisconnected");
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url);
    await expect(page.getByRole("form", { name: "Masanao staff sign in" })).toHaveAttribute("data-client-ready", "true");
    await page.getByLabel("Username", { exact: true }).fill(testCredentials.username);
    await page.getByLabel("Password", { exact: true }).fill(testCredentials.password);
    await page.getByLabel("Password", { exact: true }).press("Enter");
    await expect(page).toHaveURL(`${url}/dashboard`);
    await page.goto(`${url}/master-data`);
    await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
    if (createRecord) {
      await page.getByRole("button", { name: "Create Unit", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("textbox", { name: "Name", exact: true }).fill("Installer verification unit");
      await dialog.getByRole("textbox", { name: "Abbreviation", exact: true }).fill("ivunit");
      await dialog.getByRole("button", { name: "Create Unit", exact: true }).click();
      await expect(dialog).toHaveCount(0);
    }
    await page.getByRole("searchbox").fill("Installer verification unit");
    await expect(page.getByRole("row").filter({ hasText: "Installer verification unit" })).toBeVisible();
    assert.deepEqual(blocked, [], "The installed browser flow attempted a non-local request");
    assert.deepEqual(errors, [], "The installed browser flow raised a JavaScript error");
  } finally {
    await browser.close();
  }
}

let server;
let installed = false;
const damagedLauncher = `${launcher}.damaged`;
let launcherRenamed = false;
try {
  await verifyInstallDestination();
  await run(previousInstaller, [...setupOptions, `/DIR=${app}`, `/LOG=${join(temp, "install.log")}`]);
  installed = true;
  assert.equal(spawnSync("reg.exe", ["query", registryKey, "/reg:64"], { windowsHide: true }).status, 0,
    "The installed app did not register under the expected Windows identity");
  await run(node, [launcher, "create-admin"], JSON.stringify(testCredentials));
  assert.equal(await start(node, [launcher, "create-admin"], JSON.stringify(staffCredentials)).done, 1, "Bootstrap allowed a second administrator");
  const secret = await readFile(join(data, "auth-secret.txt"), "utf8");
  server = start(node, [launcher, "start-test"]);
  const cookie = await verifyLogin(server);
  const saved = await fetch(`${url}/api/admin/accounts`, {
    method: "POST",
    headers: { cookie, origin: url, "content-type": "application/json" },
    body: JSON.stringify(staffCredentials),
  });
  assert.equal(saved.status, 201, "Production app did not save a staff account");
  await verifyBrowser(true);

  await rename(launcher, damagedLauncher);
  launcherRenamed = true;
  await run(installer, [...setupOptions, `/DIR=${app}`, `/LOG=${join(temp, "reinstall.log")}`]);
  assert.equal(await server.done, 0, "Installer did not stop the previous app cleanly");
  await unlink(damagedLauncher);
  launcherRenamed = false;
  assert.equal(await readFile(join(data, "auth-secret.txt"), "utf8"), secret);
  await verifyPortConflict("127.0.0.1");
  const hasIPv6 = await verifyPortConflict("::1");

  // Simulate a new version shipping one more migration, using only this test install.
  const migration = join(app, "src", "prisma", "migrations", "99999999999999_installer_smoke");
  await mkdir(migration);
  await writeFile(join(migration, "migration.sql"), 'CREATE TABLE "installer_smoke" ("id" INTEGER PRIMARY KEY);\n');
  server = start(node, [launcher, "start-test"]);
  await verifyLogin(server);
  await verifyLogin(server, staffCredentials);
  await run(node, [launcher, "start-test"]);
  if (hasIPv6) assert.equal((await fetch("http://[::1]:3000/login")).status, 200);
  const backups = await readdir(join(data, "backups"));
  assert.equal(backups.length, 1, "The pending migration did not create exactly one backup");
  assert.ok((await stat(join(data, "backups", backups[0]))).size > 0);

  await run(node, [launcher, "stop"]);
  assert.equal(await server.done, 0);
  const badMigration = join(app, "src", "prisma", "migrations", "99999999999999_installer_smoke_failure");
  await mkdir(badMigration);
  await writeFile(join(badMigration, "migration.sql"), "THIS IS NOT SQL;\n");
  assert.equal(await start(node, [launcher, "start-test"]).done, 1, "A failed migration did not block startup");
  const afterFailure = await readdir(join(data, "backups"));
  const failureSnapshot = afterFailure.find((file) => !backups.includes(file));
  assert.ok(failureSnapshot, "The failed migration did not leave a recovery snapshot");
  await unlink(join(badMigration, "migration.sql"));
  await rmdir(badMigration);
  const failedData = `${data}-failed`;
  await rename(data, failedData);
  await mkdir(data);
  await copyFile(join(failedData, "auth-secret.txt"), join(data, "auth-secret.txt"));
  await copyFile(join(failedData, "backups", failureSnapshot), join(data, "masanao.db"));
  server = start(node, [launcher, "start-test"]);
  await verifyLogin(server, staffCredentials);
  await verifyBrowser(false);

  await run(await findUninstaller(), silentOptions);
  installed = false;
  assert.equal(await server.done, 0, "Uninstaller did not stop the running app cleanly");
  assert.ok((await stat(join(data, "masanao.db"))).size > 0, "Uninstall removed the user's database");
  assert.equal(spawnSync("reg.exe", ["query", registryKey, "/reg:64"], { windowsHide: true }).status, 1,
    "Uninstall left the Windows registration behind");
  console.log("Installer safety, production sign-in, upgrade, port conflicts, backup recovery, and uninstall passed.");
} catch (error) {
  console.error(`Installer test files and logs: ${temp}`);
  throw error;
} finally {
  if (launcherRenamed) await rename(damagedLauncher, launcher);
  if (server?.child.exitCode === null) {
    await run(node, [launcher, "stop"]);
    await server.done;
  }
  if (installed) await run(await findUninstaller(), silentOptions);
}
