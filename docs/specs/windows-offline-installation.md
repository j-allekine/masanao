# Offline Windows installation

## Scope

Package the existing Masanao application for guided testing on one Windows PC and one Windows account. Target 64-bit Windows with an Intel or AMD processor. Masanao opens in the default browser at `http://localhost:3000` and listens only on the local computer.

The installer carries the production build, Node.js, SQLite support, and database migrations. It can run after the download with the internet disconnected.

## Canonical source and installer versions

The merged source on `main` is the source of truth. The Windows workflow builds an installer from a selected source revision. Files under `build/windows` are generated outputs, not the canonical application. Build through `scripts/windows/build-installer.ps1`; it stages a fresh production build and excludes generated Next.js caches, diagnostics, and types.

A GitHub release installer is a fixed snapshot. Merging source changes does not replace an existing download: build and publish a new version to distribute those changes.

## Install and use

1. Run `Masanao-Setup-<version>-x64.exe` under the Windows account that will use Masanao. The installer creates a Start menu group and offers a desktop shortcut.
2. Open **Masanao**. Its Windows launcher uses the same sprout logo as the system, starts the local server without a Command Prompt window, and opens the default browser when ready.
3. On first launch with no user accounts, sign in with username **admin** and password **password123**. Ask the maintainer to change this initial password before daily use. Existing accounts and changed passwords are preserved on later launches, upgrades, and reinstalls. The optional **Set up first administrator** tool still supports custom credentials before the first launch.
4. Opening the shortcut again uses the running instance. If another app occupies port `3000` on either localhost address, the launcher displays an error dialog. Diagnostic logs are saved under `Data\logs`. Closing the browser leaves the local server running; use **Stop Masanao** in the Start menu to shut it down before maintenance.

## Data and upgrades

- App files default to `%LOCALAPPDATA%\Programs\Masanao`. The database and its authentication secret live in `%LOCALAPPDATA%\Masanao\Data` and survive reinstall and uninstall.
- Run a newer installer to update. Setup accepts an empty destination for a fresh install or the registered Masanao folder for an update. It stops the running copy. On first launch, the installed app checks the migration history and saves a SQLite snapshot under `Data\backups` before applying pending changes. A failed migration blocks startup and leaves the backup available for maintainer-led recovery. Use the same Windows account and keep the data folder private.
- For a manual backup or transfer, stop Masanao, confirm it has stopped, and copy the complete `Data` folder to a secure location. For recovery, preserve the current folder separately before restoring a known-good copy and use a compatible installer. An existing database without compatible Prisma migration history requires a separate migration plan.
- In-place binary rollback, a backup UI, automatic updates, and a browser onboarding wizard are outside the preview scope.

To recover from a failed migration, stop Masanao and rename the current `Data` folder to preserve it. Reinstall the previous version. In a fresh `Data` folder, place `auth-secret.txt` from the preserved folder and a copy of the pre-update snapshot named `masanao.db`. Start Masanao and confirm the records are present before retiring the preserved folder.

## Develop and test side by side

Keep the usual development checkout and a separate development database. Run `pnpm dev --hostname 127.0.0.1 --port 3001` and set `BETTER_AUTH_URL=http://127.0.0.1:3001` for development. Open development at `http://127.0.0.1:3001` and the installed copy at `http://localhost:3000`. The two hostnames keep their browser login cookies separate. The installed runtime sets its own database path and authentication configuration.

Development previews keep their own accounts and records. The Windows launcher's initial `admin` account applies only to an installed database with no users; `pnpm dev` does not run that bootstrap. A manual account added to a local preview is not included in source control or installer downloads. If credentials fail, first identify which copy and database are serving the page; do not reset existing accounts or copy a preview database into an installer.

## Build and distribute

Run this command on a Windows x64 development machine with Node.js 24, pnpm, and Inno Setup.

```powershell
./scripts/windows/build-installer.ps1 -Version '0.1.0-preview.1' -Compiler 'C:\path\to\ISCC.exe'
```

The installer is written to `build/windows`. The build copies the working files into a temporary directory and stages a relocatable copy of the runtime.

Pull requests that change the installer or its workflow build a test artifact automatically. Once the workflow is on the default branch, open **Actions → Windows installer → Run workflow** to test a selected branch. Enter a unique version. With **Publish** off, download the `.exe` from the run's artifact after the smoke test passes. With **Publish** on and the default branch selected, the workflow also attaches the `.exe` to a versioned GitHub prerelease. Release builds carry no user database or authentication secret. They include the initial credentials documented above, which are applied only when no user accounts exist.

## Acceptance checks

- Run `node --test tests/windows-local-data.test.mjs tests/windows-browser-launch.test.mjs` after installing development dependencies to verify initial credentials, password preservation, custom-account preservation, concurrent first launches, and the browser's actual Windows startup flags. The browser check runs on Windows and prevents the browser inheriting a hidden-window setting.
- The Windows smoke test launches `Masanao.exe`, checks that it uses the Windows GUI subsystem, signs in with the initial administrator account, changes its password, and verifies the changed password after restart and reinstall. When testing an older installer, it also supports the earlier manual-account setup flow.
- In a clean test Windows profile, set `MASANAO_VERIFY_SHORTCUTS=1` to create and inspect the actual desktop, Start menu, and Stop shortcuts and open the desktop shortcut. This uses the installer's fixed **Masanao** Start menu group.
- The Windows smoke test checks unsafe destinations, account setup, port conflicts, upgrade with the app running, failed migration recovery, and uninstall data preservation. Run it only in a Windows profile without an existing Masanao installation. Pass a previous installer as the second path to test an upgrade across versions. With Playwright Chromium installed, set `MASANAO_VERIFY_BROWSER=1` to also exercise sign-in, record creation, and record recovery in a browser with non-local requests blocked.
- Before daily use, confirm the full install and shortcut flow on a clean target PC with its network disconnected. Save a representative record, install a newer build, and confirm the record can still be opened. Confirm the maintainer can recover a backup on a separate test copy.
