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
const verifyShortcuts = process.env.MASANAO_VERIFY_SHORTCUTS === "1";
// The installer fixes its group name with DisableProgramGroupPage=yes.
const testGroup = "Masanao";
const setupOptions = verifyShortcuts
  ? [...silentOptions, "/MERGETASKS=desktopicon"]
  : [...silentOptions, "/NOICONS", "/MERGETASKS=!desktopicon"];
const testCredentials = { username: "installer.test", password: randomBytes(16).toString("hex") };
const staffCredentials = { username: "installer.staff", password: randomBytes(16).toString("hex") };

async function startServer() {
  const executable = join(app, "Masanao.exe");
  if (await stat(executable).catch(() => null)) {
    const bytes = await readFile(executable);
    const pe = bytes.readUInt32LE(0x3c);
    assert.equal(bytes.readUInt16LE(pe + 24 + 68), 2, "Masanao must use the Windows GUI subsystem (no console)");
    return start(executable, ["start-test"]);
  }
  return start(node, [launcher, "start-test"]);
}

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

async function stopServer() {
  const executable = join(app, "Masanao.exe");
  if (await stat(executable).catch(() => null)) await run(executable, ["stop"]);
  else await run(node, [launcher, "stop"]);
}

function verifyInstalledShortcuts() {
  if (!verifyShortcuts) return;
  const powershell = join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const script = `
    [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
    $shell = New-Object -ComObject WScript.Shell
    $desktop = [Environment]::GetFolderPath('Desktop')
    $programs = [Environment]::GetFolderPath('Programs')
    @(
      $shell.CreateShortcut((Join-Path $desktop 'Masanao.lnk'))
      $shell.CreateShortcut((Join-Path (Join-Path $programs $env:MASANAO_TEST_GROUP) 'Masanao.lnk'))
      $shell.CreateShortcut((Join-Path (Join-Path $programs $env:MASANAO_TEST_GROUP) 'Stop Masanao.lnk'))
    ) | ForEach-Object {
      @{ target = $_.TargetPath; icon = $_.IconLocation; directory = $_.WorkingDirectory; arguments = $_.Arguments }
    } | ConvertTo-Json -Compress
  `;
  const result = spawnSync(powershell, ["-NoProfile", "-Command", script], {
    env: { ...env, MASANAO_TEST_GROUP: testGroup }, windowsHide: true, encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  const shortcuts = JSON.parse(result.stdout);
  assert.equal(shortcuts.length, 3);
  for (const shortcut of shortcuts) {
    assert.equal(shortcut.target.toLowerCase(), join(app, "Masanao.exe").toLowerCase());
    assert.equal(shortcut.directory.toLowerCase(), app.toLowerCase());
    assert.equal(shortcut.icon.split(",")[0].toLowerCase(), join(app, "Masanao.ico").toLowerCase());
  }
  assert.equal(shortcuts[0].arguments, "");
  assert.equal(shortcuts[1].arguments, "");
  assert.equal(shortcuts[2].arguments, "stop");
  console.log("Desktop, Start menu, and Stop shortcuts use the native launcher and Masanao icon.");
}

async function verifyDesktopLaunch() {
  if (!verifyShortcuts) return;
  const powershell = join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const result = spawnSync(powershell, ["-NoProfile", "-Command", `
    $shortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Masanao.lnk'
    $process = Start-Process -FilePath $shortcut -WindowStyle Hidden -Wait -PassThru
    exit $process.ExitCode
  `], { env, windowsHide: true, encoding: "utf8", timeout: 30_000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  console.log("Real desktop shortcut opened the running application through its native launcher.");
  const hold = process.env.MASANAO_VERIFY_HOLD_FILE;
  if (hold) {
    await writeFile(`${hold}.ready`, JSON.stringify({ app, data, url }));
    const deadline = Date.now() + 180_000;
    while (!(await stat(`${hold}.release`).catch(() => null))) {
      if (Date.now() >= deadline) throw new Error("Timed out waiting for visual shortcut verification");
      await delay(250);
    }
  }
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
    await page.getByRole("textbox", { name: "Username" }).fill(testCredentials.username);
    await page.locator('input[name="password"]').fill(testCredentials.password);
    await page.locator('input[name="password"]').press("Enter");
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
    for (const path of ["/dashboard", "/items", "/inventory", "/inventory/opening-stock", "/purchase-orders", "/activity-designs", "/activities", "/recipes"]) {
      const response = await page.goto(`${url}${path}`);
      assert.equal(response.status(), 200, `Installed route failed: ${path}`);
      await expect(page.locator("main").first()).toBeVisible();
    }
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
  if (await stat(join(app, "Masanao.exe")).catch(() => null)) {
    testCredentials.username = "admin";
    server = await startServer();
    const initialCookie = await verifyLogin(server, { username: "admin", password: "password123" });
    const changed = await fetch(`${url}/api/auth/change-password`, {
      method: "POST",
      headers: { cookie: initialCookie, origin: url, "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: "password123", newPassword: testCredentials.password }),
    });
    assert.equal(changed.status, 200, "Could not change the default administrator password");
    await stopServer();
    assert.equal(await server.done, 0);
  } else {
    await run(node, [launcher, "create-admin"], JSON.stringify(testCredentials));
  }
  assert.equal(await start(node, [launcher, "create-admin"], JSON.stringify(staffCredentials)).done, 1, "Bootstrap allowed a second administrator");
  const secret = await readFile(join(data, "auth-secret.txt"), "utf8");
  server = await startServer();
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
  verifyInstalledShortcuts();
  assert.equal(await readFile(join(data, "auth-secret.txt"), "utf8"), secret);
  await verifyPortConflict("127.0.0.1");
  const hasIPv6 = await verifyPortConflict("::1");

  // Simulate a new version shipping one more migration, using only this test install.
  const migration = join(app, "src", "prisma", "migrations", "99999999999999_installer_smoke");
  await mkdir(migration);
  await writeFile(join(migration, "migration.sql"), 'CREATE TABLE "installer_smoke" ("id" INTEGER PRIMARY KEY);\n');
  server = await startServer();
  await verifyLogin(server);
  await verifyLogin(server, staffCredentials);
  if (testCredentials.username !== "admin") {
    const defaultLogin = await fetch(`${url}/api/auth/sign-in/username`, {
      method: "POST",
      headers: { origin: url, "content-type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "password123" }),
    });
    assert.equal(defaultLogin.status, 401, "Upgrade added a default account despite existing users");
  }
  await run(node, [launcher, "start-test"]);
  if (hasIPv6) assert.equal((await fetch("http://[::1]:3000/login")).status, 200);
  const backups = await readdir(join(data, "backups"));
  assert.equal(backups.length, 1, "The pending migration did not create exactly one backup");
  assert.ok((await stat(join(data, "backups", backups[0]))).size > 0);

  await stopServer();
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
  server = await startServer();
  await verifyLogin(server, staffCredentials);
  await verifyBrowser(false);
  await verifyDesktopLaunch();
  await run(node, ["--eval", `
    const assert = require('node:assert/strict');
    const path = require('node:path');
    const load = require('node:module').createRequire(path.join(process.argv[1], 'package.json'));
    const Database = load('better-sqlite3');
    const database = new Database(path.join(process.argv[2], 'masanao.db'), { readonly: true, fileMustExist: true });
    try {
      assert.equal(database.prepare('PRAGMA quick_check').get().quick_check, 'ok');
      assert.deepEqual(database.prepare('PRAGMA foreign_key_check').all(), []);
      assert.equal(database.prepare('SELECT COUNT(*) AS count FROM "user"').get().count, 2);
      console.log('SQLite integrity, foreign keys, and preserved account count passed.');
    } finally { database.close(); }
  `, app, data]);

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
