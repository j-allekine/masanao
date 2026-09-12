# Development Setup

Status: supported developer setup for Masanao.

## Runtime contract

Use the versions declared by the repository:

| Tool | Supported contract | Role |
| --- | --- | --- |
| Node.js | 22.x or 24.x | Node 22.x is the Linux CI baseline. Node 24.x is supported and is the Windows verification target. |
| pnpm | 11.13.1 | The package manager and lockfile workflow for this repository. |

The Node 24 Windows target is intentional. A native-binding installation
error on Node 24 is not, by itself, evidence that Node 24 is incompatible with
Masanao. First determine whether the published native prebuild was used or
whether installation fell back to a local source build.

Install dependencies separately in each clone or worktree. The lockfile is
authoritative; do not replace `pnpm install --frozen-lockfile` with another
package manager's install command.

## Normal Windows install: published prebuild

For a normal online install on Windows x64:

```powershell
node --version
pnpm --version
pnpm install --frozen-lockfile
```

The expected path is for `better-sqlite3` to obtain a published native
prebuild matching the active Node.js runtime and Windows architecture. The
package lifecycle script must be allowed to run so that this installation
path can complete. This repository permits the `better-sqlite3` build script
through `pnpm-workspace.yaml`.

Visual Studio Build Tools are not required for this normal prebuilt path. A
working Visual C++ Redistributable can run a compatible native module, but it
does not compile one.

Do not use `--ignore-scripts` for the normal setup. Disabling lifecycle
scripts, or blocking the package's install script, can leave the JavaScript
package present while its native binding is missing or unusable.

## Optional source-build fallback

The source-build fallback is only needed when a matching prebuild cannot be
obtained or used, for example when working offline, behind a network that
blocks the prebuild download, or on an operating-system/architecture/runtime
combination without a published prebuild.

`node-gyp` source compilation on Windows requires all of the following:

- Python, for the `node-gyp` configure/build step.
- Visual Studio Build Tools with the MSVC C++ build workload.
- A Windows SDK selected for that Build Tools installation.

The full Visual Studio IDE is not required. The Visual C++ Redistributable
and Visual Studio Build Tools are different components:

| Component | Provides | Does not provide |
| --- | --- | --- |
| Visual C++ Redistributable | Runtime libraries used by compatible MSVC-built native modules | A compiler, C++ headers, `node-gyp`, or a Windows SDK |
| Visual Studio Build Tools | MSVC compiler/toolchain and the Windows SDK needed to compile the module | The already-built native binding itself |

After the fallback prerequisites are installed, rerun the package lifecycle
for the native dependency:

```powershell
pnpm rebuild better-sqlite3
```

This command can still fail if the active Node.js version, operating system,
or architecture has no compatible source/build support. That is a separate
compatibility result from a missing compiler error.

## Diagnose a missing or incompatible binding

Use this short path before changing application code or downgrading Node.js:

1. Confirm the contract:

   ```powershell
   node --version
   pnpm --version
   ```

   Use Node 22.x or Node 24.x and pnpm 11.13.1.

2. Inspect the resolved native dependency and reinstall with the lockfile:

   ```powershell
   pnpm why better-sqlite3
   pnpm install --frozen-lockfile
   ```

3. If the install completed with scripts disabled or the binding is still
   unavailable, rerun its lifecycle script:

   ```powershell
   pnpm rebuild better-sqlite3
   ```

4. Check the first native-install error. Messages mentioning a missing
   prebuild, `node-gyp`, `find VS`, MSVC, Python, or the Windows SDK indicate
   that installation took or attempted the source-build fallback. A normal
   online install should not require that toolchain.

5. Verify the direct binding before investigating application behavior:

   ```powershell
   pnpm exec node -e "const Database=require('better-sqlite3'); const db=new Database(':memory:'); console.log(db.prepare('select 1 as ok').get())"
   ```

   If this fails with a native-module load error, repair the install or
   fallback prerequisites first. If it succeeds, continue with the normal
   Masanao checks such as `pnpm test:run` or `pnpm dev`.

Keep the original install output when reporting a failure. In particular,
distinguish a blocked lifecycle script or unavailable prebuild from an
incompatible Node.js runtime; Node 24 is a supported Windows target.
