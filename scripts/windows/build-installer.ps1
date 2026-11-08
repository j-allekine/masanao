param(
    [Parameter(Mandatory)]
    [ValidatePattern('^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$')]
    [string] $Version,
    [Parameter(Mandatory)]
    [string] $Compiler
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repository = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$compilerPath = (Resolve-Path -LiteralPath $Compiler).Path
$node = (Get-Command node.exe).Source
$nodeVersion = & $node --version
if ((& $node -p 'process.platform.concat(String.fromCharCode(45),process.arch)') -ne 'win32-x64' -or $nodeVersion -notmatch '^v24\.') {
    throw 'Build the installer with 64-bit Node.js 24 on Windows.'
}

function Copy-Directory($source, $destination, $excludeDirectories = @()) {
    $options = @('/E', '/XJ', '/R:1', '/W:1', '/NFL', '/NDL', '/NJH', '/NJS', '/NP')
    if ($excludeDirectories.Count -gt 0) { $options += @('/XD') + $excludeDirectories }
    & robocopy.exe $source $destination @options
    if ($LASTEXITCODE -ge 8) { throw "Could not stage $source (Robocopy exit code $LASTEXITCODE)." }
}

$output = Join-Path $repository 'build/windows'
$work = Join-Path ([IO.Path]::GetTempPath()) ('masanao-build-' + [guid]::NewGuid())
$payload = Join-Path $work 'payload'
$build = Join-Path $work 'source'
New-Item -ItemType Directory -Path $output, $payload, $build -Force | Out-Null

$configFiles = @('package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'prisma7.config.ts', 'next.config.ts', 'postcss.config.mjs', 'tsconfig.json')
$buildEnvironment = @{
    DATABASE_URL = 'file:./build-only.db'
    BETTER_AUTH_URL = 'http://localhost:3000'
    BETTER_AUTH_SECRET = 'build-only-placeholder-absent-at-runtime'
    NEXT_DIST_DIR = '.next-build-windows'
    NEXT_TELEMETRY_DISABLED = '1'
}
$previousEnvironment = @{}

Push-Location $build
try {
    foreach ($file in $configFiles) { Copy-Item -LiteralPath (Join-Path $repository $file) -Destination $build }
    Copy-Directory (Join-Path $repository 'src') (Join-Path $build 'src') @('generated')
    Copy-Directory (Join-Path $repository 'public') (Join-Path $build 'public')
    pnpm install --frozen-lockfile --config.node-linker=hoisted
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
    if (!(Select-String -LiteralPath 'node_modules/.modules.yaml' -Pattern '"?nodeLinker"?\s*:\s*"?hoisted\b' -Quiet)) {
        throw 'The installer build requires a relocatable hoisted node_modules tree.'
    }
    foreach ($key in $buildEnvironment.Keys) {
        $previousEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
        [Environment]::SetEnvironmentVariable($key, $buildEnvironment[$key], 'Process')
    }

    & $node 'node_modules/prisma/build/index.js' generate --generator client --config prisma7.config.ts
    if ($LASTEXITCODE -ne 0) { throw 'Prisma client generation failed.' }
    & $node 'node_modules/next/dist/bin/next' build
    if ($LASTEXITCODE -ne 0) { throw 'Next.js production build failed.' }

    Copy-Item -LiteralPath 'package.json', 'prisma7.config.ts', 'next.config.ts' -Destination $payload
    Copy-Directory '.next-build-windows' (Join-Path $payload '.next-build-windows') @('cache', 'diagnostics', 'types')
    # Turbopack gives some server dependencies hashed aliases backed by absolute
    # Windows junctions. Copy those packages so the build can move to another PC.
    $aliases = Join-Path $build '.next-build-windows/node_modules'
    if (Test-Path -LiteralPath $aliases) {
        $modules = (Resolve-Path -LiteralPath 'node_modules').Path + '\'
        foreach ($alias in (Get-ChildItem -LiteralPath $aliases -Recurse -Directory -Attributes ReparsePoint)) {
            $target = (Resolve-Path -LiteralPath $alias.Target).Path
            if (!$target.StartsWith($modules, [StringComparison]::OrdinalIgnoreCase)) {
                throw "Unexpected external module target for $($alias.Name)."
            }
            $aliasPath = $alias.FullName.Substring($build.Length + 1)
            Copy-Directory $target (Join-Path $payload $aliasPath)
        }
    }
    Move-Item -LiteralPath 'node_modules' -Destination (Join-Path $payload 'node_modules')
    Remove-Item -LiteralPath (Join-Path $payload 'node_modules/.modules.yaml') -Force
    Copy-Directory 'public' (Join-Path $payload 'public')
    New-Item -ItemType Directory -Path (Join-Path $payload 'src/prisma') -Force | Out-Null
    Copy-Item -LiteralPath 'src/prisma/schema.prisma' -Destination (Join-Path $payload 'src/prisma')
    Copy-Directory 'src/prisma/migrations' (Join-Path $payload 'src/prisma/migrations')
    New-Item -ItemType Directory -Path (Join-Path $payload 'scripts/windows') -Force | Out-Null
    foreach ($file in @('local-data.mjs', 'launcher.mjs', 'next-process.cjs', 'start.cmd', 'create-admin.ps1')) {
        Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination (Join-Path $payload 'scripts/windows')
    }
    Copy-Item -LiteralPath $node -Destination (Join-Path $payload 'node.exe')
    $nodeLicense = Join-Path (Split-Path $node) 'LICENSE'
    if (Test-Path -LiteralPath $nodeLicense) {
        Copy-Item -LiteralPath $nodeLicense -Destination (Join-Path $payload 'Node-LICENSE.txt')
    } else {
        Invoke-WebRequest -Uri "https://raw.githubusercontent.com/nodejs/node/$nodeVersion/LICENSE" -OutFile (Join-Path $payload 'Node-LICENSE.txt')
    }

    & $compilerPath /Q "/DAppVersion=$Version" "/DPayloadDir=$payload" "/O$work" (Join-Path $PSScriptRoot 'installer.iss')
    if ($LASTEXITCODE -ne 0) { throw 'Windows installer compilation failed.' }
    $fileName = "Masanao-Setup-$Version-x64.exe"
    $installer = Join-Path $output $fileName
    $pendingInstaller = Join-Path $output ('.' + [guid]::NewGuid() + '.tmp')
    Copy-Item -LiteralPath (Join-Path $work $fileName) -Destination $pendingInstaller
    Move-Item -LiteralPath $pendingInstaller -Destination $installer -Force
    Write-Output "Installer: $installer"
} finally {
    Pop-Location
    foreach ($key in $previousEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable($key, $previousEnvironment[$key], 'Process')
    }
    $resolvedWork = (Resolve-Path -LiteralPath $work).Path
    if ((Split-Path $resolvedWork) -eq (Resolve-Path ([IO.Path]::GetTempPath())).Path.TrimEnd('\') -and
        (Split-Path $resolvedWork -Leaf) -match '^masanao-build-[0-9a-f-]{36}$') {
        Remove-Item -LiteralPath $resolvedWork -Recurse -Force
    }
}
