$ErrorActionPreference = 'Stop'
$taskPidFile = Join-Path $PSScriptRoot 'logs/process-ids.txt'
if (Test-Path -LiteralPath $taskPidFile) {
    foreach ($taskProcessId in Get-Content -LiteralPath $taskPidFile) {
        $taskProcess = Get-Process -Id ([int]$taskProcessId) -ErrorAction SilentlyContinue
        if ($taskProcess -and $taskProcess.ProcessName -in @('python', 'node')) {
            Stop-Process -Id $taskProcess.Id
        }
    }
    Remove-Item -LiteralPath $taskPidFile
}
