# ========================================
# TESTE COMPLETO DO FLUXO
# PI -> Contrato -> Excel/PDF
# ========================================

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "TESTE COMPLETO: PI -> CONTRATO -> DOCUMENTOS" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan

# ========================================
# CONFIGURAÇÕES
# ========================================

$baseUrl = "http://localhost:3000/api/v1"
$outputDir = "e:\backstage\BECKEND\test-outputs"

# Credenciais (ALTERE AQUI)
$email = "admin@example.com"
$password = "senha123"

# ========================================
# FUNÇÕES AUXILIARES
# ========================================

function Write-Step {
    param([string]$message, [string]$color = "Yellow")
    Write-Host "`n$message" -ForegroundColor $color
}

function Write-Success {
    param([string]$message)
    Write-Host "[OK] $message" -ForegroundColor Green
}

function Write-Error {
    param([string]$message)
    Write-Host "[ERRO] $message" -ForegroundColor Red
}

function Write-Info {
    param([string]$message)
    Write-Host "[INFO] $message" -ForegroundColor Cyan
}

# ========================================
# CRIAR DIRETÓRIO DE SAÍDA
# ========================================

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
    Write-Success "Diretório criado: $outputDir"
}

# ========================================
# PASSO 1: LOGIN
# ========================================

Write-Step "PASSO 1: Autenticação" "Yellow"

$loginData = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST `
        -Body $loginData `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    $token = $response.token
    $empresaId = $response.user.empresaId
    
    Write-Success "Login realizado com sucesso!"
    Write-Info "Token: $($token.Substring(0, 20))..."
    Write-Info "Empresa ID: $empresaId"
}
catch {
    Write-Error "Falha no login: $($_.Exception.Message)"
    exit 1
}

# ========================================
# PASSO 2: BUSCAR CLIENTE
# ========================================

Write-Step "PASSO 2: Buscando cliente existente" "Yellow"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}