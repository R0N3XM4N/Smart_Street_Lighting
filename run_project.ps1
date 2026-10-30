param(
    [string]$MySqlHost = "localhost",
    [int]$MySqlPort = 3306,
    [string]$MySqlUser = "root",
    [System.Security.SecureString]$MySqlPassword,
    [string]$WebPassword,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$mysqlShell = (Get-Command mysqlsh.exe -ErrorAction SilentlyContinue).Source
if (-not $mysqlShell) {
    $defaultMysqlShell = "C:\Program Files\MySQL\MySQL Shell 8.0\bin\mysqlsh.exe"
    if (Test-Path -LiteralPath $defaultMysqlShell) {
        $mysqlShell = $defaultMysqlShell
    } else {
        throw "MySQL Shell (mysqlsh.exe) was not found. Install MySQL Shell 8.x or add it to PATH."
    }
}

$sqlDirectory = Join-Path $projectRoot "sql file for project"
$sqlFiles = @(
    (Join-Path $sqlDirectory "01_schema_extension.sql"),
    (Join-Path $sqlDirectory "02_indexes.sql"),
    (Join-Path $sqlDirectory "03_views.sql"),
    (Join-Path $sqlDirectory "04_procedures_transaction.sql"),
    (Join-Path $sqlDirectory "05_triggers.sql"),
    (Join-Path $sqlDirectory "06_auth_roles.sql"),
    (Join-Path $projectRoot "next-app\sql\schema.sql"),
    (Join-Path $projectRoot "next-app\sql\seed.sql"),
    (Join-Path $sqlDirectory "07_analytics.sql")
)

foreach ($sqlFile in $sqlFiles) {
    if (-not (Test-Path -LiteralPath $sqlFile -PathType Leaf)) {
        throw "Required SQL file not found: $sqlFile"
    }
}

if (-not $Force) {
    Write-Host "This setup applies project SQL and refreshes the known demo seed rows."
    Write-Host "Existing non-seed records are preserved; generated demo credentials are refreshed."
    $confirmation = Read-Host "Type YES to continue"
    if ($confirmation -cne "YES") {
        Write-Host "Cancelled; no database changes were made."
        return
    }
}

if (-not $MySqlPassword) {
    $MySqlPassword = Read-Host "MySQL password for $MySqlUser" -AsSecureString
}
$passwordCredential = New-Object System.Management.Automation.PSCredential("mysql", $MySqlPassword)
$plainPassword = $passwordCredential.GetNetworkCredential().Password
if (-not $WebPassword) {
    $randomBytes = New-Object byte[] 32
    $randomGenerator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $randomGenerator.GetBytes($randomBytes)
    } finally {
        $randomGenerator.Dispose()
    }
    $WebPassword = [Convert]::ToBase64String($randomBytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}
$escapedWebPassword = $WebPassword.Replace('\', '\\').Replace("'", "''")

$sql = New-Object System.Text.StringBuilder
[void]$sql.AppendLine("CREATE DATABASE IF NOT EXISTS smart_streetlight_grid;")
[void]$sql.AppendLine("USE smart_streetlight_grid;")
[void]$sql.AppendLine("DROP VIEW IF EXISTS v_pole_summary, v_dimming_schedule;")
[void]$sql.AppendLine("DROP PROCEDURE IF EXISTS sp_update_brightness;")
[void]$sql.AppendLine("DROP TRIGGER IF EXISTS trg_after_sensor_insert;")
[void]$sql.AppendLine("DROP USER IF EXISTS 'operator'@'localhost', 'viewer'@'localhost', 'smart_lighting_web'@'localhost', 'smart_lighting_web'@'127.0.0.1', 'streetlight_web'@'localhost', 'streetlight_web'@'127.0.0.1';")
[void]$sql.AppendLine("DROP ROLE IF EXISTS smart_lighting_admin, smart_lighting_operator, smart_lighting_viewer;")

foreach ($sqlFile in $sqlFiles) {
    [void]$sql.AppendLine()
    [void]$sql.AppendLine("-- Running $([System.IO.Path]::GetFileName($sqlFile))")
    [void]$sql.AppendLine([System.IO.File]::ReadAllText($sqlFile))
}

[void]$sql.AppendLine()
[void]$sql.AppendLine("-- Recreate only the generated demo logins; unrelated app users are preserved.")
[void]$sql.AppendLine("DELETE FROM streetlight_ops.users WHERE username IN ('demo-operator', 'demo-viewer');")

[void]$sql.AppendLine()
[void]$sql.AppendLine("-- Create a dedicated least-privilege account for the local website.")
[void]$sql.AppendLine("CREATE USER 'smart_lighting_web'@'localhost' IDENTIFIED BY '$escapedWebPassword';")
[void]$sql.AppendLine("CREATE USER 'smart_lighting_web'@'127.0.0.1' IDENTIFIED BY '$escapedWebPassword';")
[void]$sql.AppendLine("GRANT smart_lighting_operator TO 'smart_lighting_web'@'localhost', 'smart_lighting_web'@'127.0.0.1';")
[void]$sql.AppendLine("SET DEFAULT ROLE smart_lighting_operator TO 'smart_lighting_web'@'localhost', 'smart_lighting_web'@'127.0.0.1';")
[void]$sql.AppendLine("CREATE USER 'streetlight_web'@'localhost' IDENTIFIED BY '$escapedWebPassword';")
[void]$sql.AppendLine("CREATE USER 'streetlight_web'@'127.0.0.1' IDENTIFIED BY '$escapedWebPassword';")
[void]$sql.AppendLine("GRANT SELECT ON streetlight_ops.v_pole_summary TO 'streetlight_web'@'localhost', 'streetlight_web'@'127.0.0.1';")
[void]$sql.AppendLine("GRANT SELECT ON streetlight_ops.v_dimming_schedule TO 'streetlight_web'@'localhost', 'streetlight_web'@'127.0.0.1';")
[void]$sql.AppendLine("GRANT SELECT ON streetlight_ops.poles TO 'streetlight_web'@'localhost', 'streetlight_web'@'127.0.0.1';")
[void]$sql.AppendLine("GRANT SELECT, INSERT ON streetlight_ops.users TO 'streetlight_web'@'localhost', 'streetlight_web'@'127.0.0.1';")
[void]$sql.AppendLine("GRANT SELECT, INSERT, DELETE ON streetlight_ops.sessions TO 'streetlight_web'@'localhost', 'streetlight_web'@'127.0.0.1';")
[void]$sql.AppendLine("GRANT INSERT ON streetlight_ops.poles TO 'streetlight_web'@'localhost', 'streetlight_web'@'127.0.0.1';")
[void]$sql.AppendLine("GRANT SELECT, INSERT ON streetlight_ops.readings TO 'streetlight_web'@'localhost', 'streetlight_web'@'127.0.0.1';")
[void]$sql.AppendLine("GRANT SELECT, INSERT ON streetlight_ops.schedules TO 'streetlight_web'@'localhost', 'streetlight_web'@'127.0.0.1';")
[void]$sql.AppendLine("GRANT DELETE ON streetlight_ops.schedules TO 'streetlight_web'@'localhost', 'streetlight_web'@'127.0.0.1';")
[void]$sql.AppendLine("GRANT SELECT ON streetlight_ops.power_consumption_log TO 'streetlight_web'@'localhost', 'streetlight_web'@'127.0.0.1';")
[void]$sql.AppendLine("GRANT EXECUTE ON PROCEDURE streetlight_ops.set_pole_brightness TO 'streetlight_web'@'localhost', 'streetlight_web'@'127.0.0.1';")
[void]$sql.AppendLine("SET DEFAULT ROLE ALL TO 'streetlight_web'@'localhost', 'streetlight_web'@'127.0.0.1';")

[void]$sql.AppendLine()
[void]$sql.AppendLine("SHOW TABLES;")
[void]$sql.AppendLine("SELECT * FROM v_pole_summary;")
[void]$sql.AppendLine("SELECT * FROM v_dimming_schedule;")
[void]$sql.AppendLine("USE streetlight_ops;")
[void]$sql.AppendLine("SHOW TABLES;")
[void]$sql.AppendLine("SELECT * FROM v_pole_summary ORDER BY zone, pole_code;")
[void]$sql.AppendLine("SELECT * FROM v_dimming_schedule ORDER BY zone, on_time;")

$temporarySqlFile = [System.IO.Path]::GetTempFileName()
try {
    $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($temporarySqlFile, $sql.ToString(), $utf8WithoutBom)

    Write-Host "Connecting to MySQL at ${MySqlHost}:$MySqlPort as $MySqlUser."
    Write-Host "The password is passed directly to MySQL Shell and is not written to the project."
    $mysqlArguments = @(
        "--sqlc",
        "--host=$MySqlHost",
        "--port=$MySqlPort",
        "--user=$MySqlUser",
        "--password",
        "--passwords-from-stdin",
        "--file=$temporarySqlFile"
    )
    $plainPassword | & $mysqlShell @mysqlArguments
    if ($LASTEXITCODE -ne 0) {
        throw "MySQL Shell failed with exit code $LASTEXITCODE. Check the SQL error above."
    }
    Write-Host "Database setup completed."
} finally {
    $plainPassword = $null
    if (Test-Path -LiteralPath $temporarySqlFile) {
        Remove-Item -LiteralPath $temporarySqlFile -Force
    }
}
