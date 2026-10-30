param(
    [string]$MySqlHost = "localhost",
    [int]$MySqlPort = 3306,
    [string]$MySqlUser = "root",
    [int]$WebsitePort = 3000,
    [System.Security.SecureString]$MySqlPassword,
    [switch]$Force,
    [switch]$SkipDatabaseSetup
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$appDirectory = Join-Path $projectRoot "next-app"
$localEnvironment = Join-Path $appDirectory ".env.local"

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue) -or
    -not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "Node.js 20.9 or newer (including npm) is required."
}
if (-not (Test-Path -LiteralPath (Join-Path $appDirectory "package.json"))) {
    throw "Next.js app files were not found in next-app."
}

$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if (-not $mongoService) {
    throw "MongoDB Server is required for the full Level 3 demo. Install MongoDB Server 5.0 or newer, then rerun this script."
}
if ($mongoService.Status -ne "Running") {
    try {
        Start-Service -Name $mongoService.Name
        $mongoService.WaitForStatus("Running", [TimeSpan]::FromSeconds(30))
    } catch {
        throw "Could not start the MongoDB service. Start it in Windows Services, then rerun this script. $($_.Exception.Message)"
    }
}

if ($SkipDatabaseSetup) {
    if (-not (Test-Path -LiteralPath $localEnvironment -PathType Leaf)) {
        throw "No next-app\.env.local was found. Run without -SkipDatabaseSetup first."
    }
} elseif (-not $Force) {
    Write-Host "This applies schema/features and refreshes the seeded demo rows and demo passwords."
    Write-Host "Other project records are preserved; generated local database credentials are replaced."
    $confirmation = Read-Host "Type YES to continue"
    if ($confirmation -cne "YES") {
        Write-Host "Cancelled; no database changes were made."
        return
    }
}

$password = $MySqlPassword
if (-not $SkipDatabaseSetup -and -not $password) {
    $password = Read-Host "MySQL administrator password for $MySqlUser" -AsSecureString
}

function New-RandomPassword {
    return [Guid]::NewGuid().ToString("N") + [Guid]::NewGuid().ToString("N")
}

$plainMysqlPassword = $null
$databasePassword = $null
$operatorPassword = $null
$viewerPassword = $null

try {
    if (-not $SkipDatabaseSetup) {
        $credential = New-Object System.Management.Automation.PSCredential("mysql", $password)
        $plainMysqlPassword = $credential.GetNetworkCredential().Password
        $databasePassword = New-RandomPassword

        & (Join-Path $projectRoot "run_project.ps1") `
            -MySqlHost $MySqlHost `
            -MySqlPort $MySqlPort `
            -MySqlUser $MySqlUser `
            -MySqlPassword $password `
            -WebPassword $databasePassword `
            -Force
        if (-not $?) {
            throw "Database setup failed. The Next.js app was not started."
        }

        $operatorPassword = New-RandomPassword
        $viewerPassword = New-RandomPassword
        $environmentLines = @(
            "DB_HOST=127.0.0.1",
            "DB_PORT=$MySqlPort",
            "DB_USER=streetlight_web",
            "DB_PASSWORD=$databasePassword",
            "DB_NAME=streetlight_ops",
            "SESSION_TTL_HOURS=12",
            "COOKIE_SECURE=false",
            "MONGODB_URI=mongodb://127.0.0.1:27017",
            "MONGODB_DB=streetlight_ops",
            "HOSTNAME=127.0.0.1",
            "PORT=$WebsitePort"
        )
        $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllLines($localEnvironment, $environmentLines, $utf8WithoutBom)

        Push-Location $appDirectory
        try {
            foreach ($account in @(
                @{ Username = "demo-operator"; Password = $operatorPassword; Role = "operator" },
                @{ Username = "demo-viewer"; Password = $viewerPassword; Role = "viewer" }
            )) {
                $env:INITIAL_USERNAME = $account.Username
                $env:INITIAL_PASSWORD = $account.Password
                $env:INITIAL_ROLE = $account.Role
                & node.exe --env-file=.env.local .\scripts\create-user.mjs
                if ($LASTEXITCODE -ne 0) {
                    throw "Could not create the demo $($account.Role) account."
                }
            }
        } finally {
            Remove-Item Env:INITIAL_USERNAME, Env:INITIAL_PASSWORD, Env:INITIAL_ROLE -ErrorAction SilentlyContinue
            Pop-Location
        }
    }

    Push-Location $appDirectory
    try {
        $env:DEMO_OPERATOR_REGISTRATION = "true"
        $env:NEXT_PUBLIC_DEMO_OPERATOR_REGISTRATION = "true"

        if (-not (Test-Path -LiteralPath (Join-Path $appDirectory "node_modules\next"))) {
            Write-Host "Installing locked Next.js dependencies..."
            & npm.cmd ci
            if ($LASTEXITCODE -ne 0) {
                throw "npm ci failed; see the error above."
            }
        }

        Write-Host "Provisioning MongoDB telemetry indexes..."
        & node.exe --env-file=.env.local .\scripts\mongo-setup.mjs
        if ($LASTEXITCODE -ne 0) {
            throw "MongoDB setup failed. The full database demo was not started."
        }

        Write-Host "Checking Next.js TypeScript types..."
        & npm.cmd run typecheck
        if ($LASTEXITCODE -ne 0) {
            throw "Next.js typecheck failed."
        }

        Write-Host "Building the Next.js application..."
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) {
            throw "Next.js production build failed."
        }

        if (-not $SkipDatabaseSetup) {
            Write-Host ""
            Write-Host "Demo login accounts (generated locally for this setup):"
            Write-Host "Operator: demo-operator / $operatorPassword"
            Write-Host "Viewer:   demo-viewer / $viewerPassword"
            Write-Host "These passwords are not stored in the repository."
        }

        Write-Host "Starting the Next.js application at http://localhost:$WebsitePort"
        & npm.cmd start -- --hostname 127.0.0.1 --port $WebsitePort
        if ($LASTEXITCODE -ne 0) {
            throw "Next.js server exited with code $LASTEXITCODE."
        }
    } finally {
        Pop-Location
    }
} finally {
    $plainMysqlPassword = $null
    $databasePassword = $null
    $operatorPassword = $null
    $viewerPassword = $null
    if ($password) {
        $password.Dispose()
    }
}
