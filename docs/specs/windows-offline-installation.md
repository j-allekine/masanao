# Offline Windows installation

## Scope

Package the existing Masanao application for guided testing on one Windows PC and one Windows account. Target 64-bit Windows with an Intel or AMD processor. Masanao opens in the default browser at `http://localhost:3000` and listens only on the local computer.

The installer carries the production build, Node.js, SQLite support, and database migrations. It can run after the download with the internet disconnected. The maintainer guides the user through first-account setup and updates.

## Install and use

1. Run `Masanao-Setup-<version>-x64.exe` under the Windows account that will use Masanao. The installer creates a Start menu group and offers a desktop shortcut.
2. For a fresh database, open **Set up first administrator** in the Start menu group and enter the credentials. The local tool creates the first account only when the user table is empty.
3. Open **Masanao** and sign in. Opening the shortcut again uses the running instance. If another app occupies port `3000` on either localhost address, the launcher reports the conflict. Use **Stop Masanao** to shut down the server before maintenance.

## Data and upgrades

- App files default to `%LOCALAPPDATA%\Programs\Masanao`. The database and its authentication secret live in `%LOCALAPPDATA%\Masanao\Data` and survive reinstall and uninstall.
- Run a newer installer to update. Setup accepts an empty destination for a fresh install or the registered Masanao folder for an update. It stops the running copy. On first launch, the installed app checks the migration history and saves a SQLite snapshot under `Data\backups` before applying pending changes. A failed migration blocks startup and leaves the backup available for maintainer-led recovery. Use the same Windows account and keep the data folder private.
- For a manual backup or transfer, stop Masanao, confirm it has stopped, and copy the complete `Data` folder to a secure location. For recovery, preserve the current folder separately before restoring a known-good copy and use a compatible installer. An existing database without compatible Prisma migration history requires a separate migration plan.
- In-place binary rollback, a backup UI, automatic updates, and a browser onboarding wizard are outside the preview scope.

To recover from a failed migration, stop Masanao and rename the current `Data` folder to preserve it. Reinstall the previous version. In a fresh `Data` folder, place `auth-secret.txt` from the preserved folder and a copy of the pre-update snapshot named `masanao.db`. Start Masanao and confirm the records are present before retiring the preserved folder.

## Develop and test side by side

Keep the usual development checkout and a separate development database. Run `pnpm dev --hostname 127.0.0.1 --port 3001` and set `BETTER_AUTH_URL=http://127.0.0.1:3001` for development. Open development at `http://127.0.0.1:3001` and the installed copy at `http://localhost:3000`. The two hostnames keep their browser login cookies separate. The installed runtime sets its own database path and authentication configuration.

## Build and distribute

Run this command on a Windows x64 development machine with Node.js 24, pnpm, and Inno Setup.

```powershell
./scripts/windows/build-installer.ps1 -Version '0.1.0-preview.1' -Compiler 'C:\path\to\ISCC.exe'
```

The installer is written to `build/windows`. The build copies the working files into a temporary directory and stages a relocatable copy of the runtime.

Pull requests that change the installer or its workflow build a test artifact automatically. Once the workflow is on the default branch, open **Actions → Windows installer → Run workflow** to test a selected branch. Enter a unique version. With **Publish** off, download the `.exe` from the run's artifact after the smoke test passes. With **Publish** on and the default branch selected, the workflow also attaches the `.exe` to a versioned GitHub prerelease. Release builds carry no user database or credentials.

## Acceptance checks

- The Windows smoke test checks unsafe destinations, account setup, port conflicts, upgrade with the app running, failed migration recovery, and uninstall data preservation. Run it only in a Windows profile without an existing Masanao installation. Pass a previous installer as the second path to test an upgrade across versions. With Playwright Chromium installed, set `MASANAO_VERIFY_BROWSER=1` to also exercise sign-in, record creation, and record recovery in a browser with non-local requests blocked.
- Before daily use, confirm the full install and shortcut flow on a clean target PC with its network disconnected. Save a representative record, install a newer build, and confirm the record can still be opened. Confirm the maintainer can recover a backup on a separate test copy.
