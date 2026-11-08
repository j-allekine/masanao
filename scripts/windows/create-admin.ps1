$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot '../..'
$username = Read-Host 'Administrator username'
$password = Read-Host 'Administrator password' -AsSecureString
$confirmation = Read-Host 'Repeat password' -AsSecureString

try {
    $passwordText = [System.Net.NetworkCredential]::new('', $password).Password
    if ($passwordText -cne [System.Net.NetworkCredential]::new('', $confirmation).Password) {
        throw 'The passwords do not match.'
    }
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    @{ username = $username; password = $passwordText } | ConvertTo-Json -Compress |
        & (Join-Path $root 'node.exe') (Join-Path $PSScriptRoot 'launcher.mjs') create-admin
    if ($LASTEXITCODE -ne 0) { throw 'Account setup failed. If Masanao is running, stop it first.' }
} finally {
    $password.Dispose()
    $confirmation.Dispose()
    $passwordText = $null
    Read-Host 'Press Enter to close'
}
