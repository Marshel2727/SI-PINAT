$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$target = Join-Path $projectRoot '.env'
if (Test-Path -LiteralPath $target) { throw '.env sudah ada; tidak ditimpa.' }
function New-ProjectSecret {
    $secretBytes = New-Object byte[] 32
    $secretRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $secretRng.GetBytes($secretBytes) } finally { $secretRng.Dispose() }
    return ([BitConverter]::ToString($secretBytes)).Replace('-', '').ToLowerInvariant()
}
$envContent = Get-Content -LiteralPath (Join-Path $projectRoot '.env.example') -Raw
$envContent = $envContent.Replace('CHANGE_ME_DB_PASSWORD', (New-ProjectSecret))
$envContent = $envContent.Replace('CHANGE_ME_ROOT_PASSWORD', (New-ProjectSecret))
$envContent = $envContent.Replace('CHANGE_ME_APP_SECRET', (New-ProjectSecret))
[System.IO.File]::WriteAllText($target, $envContent, (New-Object System.Text.UTF8Encoding($false)))
Write-Host '.env dibuat dengan secret acak.'
