# Clear console
Clear-Host

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Enterprise AI Workflow Automation Platform (Agentic AI)" -ForegroundColor Cyan
Write-Host "                   Setup & Run Utility" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# Ensure we are in the project root directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($ScriptDir) {
    Set-Location $ScriptDir
}

# Helper: Check if command exists
function Test-CommandExists($Command) {
    return (Get-Command $Command -ErrorAction SilentlyContinue) -ne $null
}

# Helper: Setup environment files
function Setup-Environment {
    Write-Host "[*] Checking environment files..." -ForegroundColor Yellow
    
    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
            Write-Host "[+] Created root .env from .env.example" -ForegroundColor Green
            Write-Host "[!] Action Required: Please review and set your GEMINI_API_KEY in the root .env file." -ForegroundColor Red
        } else {
            Write-Host "[-] Error: .env.example not found in root!" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "[+] Root .env file exists." -ForegroundColor Green
    }

    # Ensure backend has the .env file too for local running
    if (-not (Test-Path "backend/.env")) {
        Copy-Item ".env" "backend/.env"
        Write-Host "[+] Copied root .env to backend/.env" -ForegroundColor Green
    } else {
        # Check if they are in sync or offer to copy
        Write-Host "[+] backend/.env file exists." -ForegroundColor Green
    }
    
    return $true
}

# Helper: Start Docker Compose mode
function Run-DockerMode {
    Write-Host "[*] Launching in Docker Compose Mode..." -ForegroundColor Yellow
    if (-not (Test-CommandExists "docker")) {
        Write-Host "[-] Error: Docker is not installed or not in PATH." -ForegroundColor Red
        Write-Host "Please download Docker Desktop from https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
        return
    }

    # Check if docker daemon is running
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[-] Error: Docker daemon is not running. Please start Docker Desktop and try again." -ForegroundColor Red
        return
    }

    Setup-Environment
    
    Write-Host "[*] Building and starting containers..." -ForegroundColor Yellow
    docker-compose up --build
}

# Helper: Start Local Development mode
function Run-LocalMode {
    Write-Host "[*] Launching in Local Development Mode..." -ForegroundColor Yellow
    
    # Check Node.js
    if (-not (Test-CommandExists "node")) {
        Write-Host "[-] Error: Node.js is not installed or not in PATH." -ForegroundColor Red
        return
    }
    
    $nodeVersion = node -v
    Write-Host "[+] Found Node.js version: $nodeVersion" -ForegroundColor Green
    
    Setup-Environment

    # Install Backend Dependencies
    Write-Host "[*] Checking and installing backend dependencies..." -ForegroundColor Yellow
    cd backend
    if (-not (Test-Path "node_modules")) {
        Write-Host "[*] Installing backend packages..." -ForegroundColor Gray
        npm install
    } else {
        Write-Host "[+] Backend node_modules already installed." -ForegroundColor Green
    }

    # Prisma Setup
    Write-Host "[*] Generating Prisma client..." -ForegroundColor Yellow
    npm run prisma:generate
    
    # Optional: run migration if local database is running
    Write-Host "[?] Is your local PostgreSQL database up and running? (y/n)" -ForegroundColor Cyan
    $dbChoice = Read-Host
    if ($dbChoice -eq 'y' -or $dbChoice -eq 'yes') {
        Write-Host "[*] Deploying database migrations..." -ForegroundColor Yellow
        npm run prisma:migrate
    } else {
        Write-Host "[!] Warning: DB migrations skipped. Make sure to run them once your database is started." -ForegroundColor Yellow
    }
    cd ..

    # Install Frontend Dependencies
    Write-Host "[*] Checking and installing frontend dependencies..." -ForegroundColor Yellow
    cd frontend
    if (-not (Test-Path "node_modules")) {
        Write-Host "[*] Installing frontend packages..." -ForegroundColor Gray
        npm install
    } else {
        Write-Host "[+] Frontend node_modules already installed." -ForegroundColor Green
    }
    cd ..

    # Run everything in separate PowerShell windows
    Write-Host "[*] Launching application services..." -ForegroundColor Yellow
    
    # Start Backend API
    Write-Host "[+] Launching Backend Server (port 4000) in a new window..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -Title "AIWF Backend Server"
    
    # Start Queue Worker
    Write-Host "[+] Launching Queue Worker in a new window..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev:worker" -Title "AIWF Queue Worker"
    
    # Start Frontend Client
    Write-Host "[+] Launching Frontend Client (port 3000) in a new window..." -ForegroundColor Green
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -Title "AIWF Frontend Client"

    Write-Host "`n[+] All services started! Check the newly opened windows for logs." -ForegroundColor Green
    Write-Host "Frontend is running at: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "Backend health-check: http://localhost:4000/health" -ForegroundColor Cyan
}

# Main Menu
function Show-Menu {
    Write-Host "Choose how you want to run the project:" -ForegroundColor Green
    Write-Host "1) Run with Docker Compose (Recommended - Starts Postgres, Redis, Backend, Worker, Frontend)" -ForegroundColor Gray
    Write-Host "2) Run Locally (Development Mode - Starts Backend, Worker, Frontend locally; requires running DB/Redis)" -ForegroundColor Gray
    Write-Host "3) Setup / Refresh environment files (.env)" -ForegroundColor Gray
    Write-Host "4) Exit" -ForegroundColor Gray
    Write-Host ""
    
    $choice = Read-Host -Prompt "Select an option [1-4]"
    
    switch ($choice) {
        "1" { Run-DockerMode }
        "2" { Run-LocalMode }
        "3" { Setup-Environment; Write-Host "[+] Setup complete!" -ForegroundColor Green }
        "4" { exit }
        default { 
            Write-Host "[-] Invalid option, please try again." -ForegroundColor Red
            Show-Menu
        }
    }
}

Show-Menu
