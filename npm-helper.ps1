# PowerShell helper script to run npm commands with refreshed PATH
# Usage: .\npm-helper.ps1 <npm-command>
# Example: .\npm-helper.ps1 "run dev"
# Example: .\npm-helper.ps1 "install"

param(
    [Parameter(Mandatory=$true)]
    [string]$Command
)

# Refresh PATH to include Node.js and npm
$machinePath = [System.Environment]::GetEnvironmentVariable("Path","Machine")
$userPath = [System.Environment]::GetEnvironmentVariable("Path","User")
$env:Path = "$machinePath;$userPath"

# Try to find Node.js if not in PATH
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    # Common Node.js installation paths
    $nodePaths = @(
        "$env:ProgramFiles\nodejs",
        "${env:ProgramFiles(x86)}\nodejs",
        "$env:LOCALAPPDATA\Programs\nodejs",
        "$env:APPDATA\npm"
    )
    
    foreach ($path in $nodePaths) {
        if (Test-Path "$path\node.exe") {
            $env:Path = "$path;$env:Path"
            break
        }
    }
    
    # Also check for npm in AppData
    $npmPath = "$env:APPDATA\npm"
    if (Test-Path $npmPath) {
        $env:Path = "$npmPath;$env:Path"
    }
}

# Verify Node.js and npm are available
try {
    $nodeVersion = node --version 2>&1
    $npmVersion = npm --version 2>&1
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js or npm not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Change to project directory
Set-Location "F:\old system\disk c\document\MR Groups"

# Run the npm command
Write-Host "Running: npm $Command" -ForegroundColor Cyan
npm $Command
