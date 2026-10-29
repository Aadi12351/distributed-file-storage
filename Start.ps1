$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
Set-Location -LiteralPath $taskRoot
if (-not (Test-Path -LiteralPath '.env')) {
    $secretBytes = New-Object byte[] 48
    $taskRng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $taskRng.GetBytes($secretBytes)
    $taskRng.Dispose()
    $taskSecret = [Convert]::ToBase64String($secretBytes)
    @("DATABASE_URL=sqlite:///./drive.db", "SECRET_KEY=$taskSecret", 'ALGORITHM=HS256', 'ACCESS_TOKEN_EXPIRE_MINUTES=480') | Set-Content -LiteralPath '.env'
}
if (Test-Path -LiteralPath 'frontend/.env') {
    # Always use the local same-origin proxy for this launcher.
    $env:VITE_API_URL = '/api'
}
$taskPython = if (Test-Path -LiteralPath '.venv/Scripts/python.exe') { Join-Path $taskRoot '.venv/Scripts/python.exe' } else { (Get-Command python.exe).Source }
if (Test-Path -LiteralPath '.runtime-packages') { $env:PYTHONPATH = Join-Path $taskRoot '.runtime-packages' }
New-Item -ItemType Directory -Force -Path 'logs' | Out-Null
$taskPids = @()
if (-not (Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue)) {
    $backendProcess = Start-Process -FilePath $taskPython -ArgumentList '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8001' -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput 'logs/backend.log' -RedirectStandardError 'logs/backend-error.log'
    $taskPids += $backendProcess.Id
}
$taskNode = (Get-Command node.exe).Source
$frontendProcess = Start-Process -FilePath $taskNode -ArgumentList 'node_modules/vite/bin/vite.js', '--host', '127.0.0.1' -WorkingDirectory (Join-Path $taskRoot 'frontend') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskRoot 'logs/frontend.log') -RedirectStandardError (Join-Path $taskRoot 'logs/frontend-error.log')
$taskPids += $frontendProcess.Id
$taskPids | Set-Content -LiteralPath 'logs/process-ids.txt'
Write-Host 'File Drive is starting. Open the URL in logs/frontend.log (normally http://localhost:5174).'
