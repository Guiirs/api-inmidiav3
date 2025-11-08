# ========================================
# TESTE RAPIDO - EXCEL V2
# ========================================

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "TESTE RAPIDO: EXCEL V2 (COPIA CONTRATO.xlsx)" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan

$baseUrl = "http://localhost:3000/api/v1"
$outputDir = "e:\backstage\BECKEND\test-outputs"

# Credenciais
$email = "admin@example.com"
$password = "senha123"

# ========================================
# PASSO 1: LOGIN
# ========================================

Write-Host "`nPASSO 1: Login..." -ForegroundColor Yellow

$loginData = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST `
        -Body $loginData `
        -ContentType "application/json"
    
    $token = $response.token
    $empresaId = $response.user.empresaId
    
    Write-Host "[OK] Login realizado!" -ForegroundColor Green
    Write-Host "[INFO] Empresa ID: $empresaId" -ForegroundColor Cyan
}
catch {
    Write-Host "[ERRO] Falha no login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ========================================
# PASSO 2: BUSCAR CONTRATO EXISTENTE
# ========================================

Write-Host "`nPASSO 2: Buscando contratos..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $contratos = Invoke-RestMethod -Uri "$baseUrl/contratos" `
        -Method GET `
        -Headers $headers
    
    if ($contratos.contratos.Count -gt 0) {
        $contratoId = $contratos.contratos[0]._id
        $numeroContrato = $contratos.contratos[0].numeroContrato
        
        Write-Host "[OK] Contrato encontrado!" -ForegroundColor Green
        Write-Host "[INFO] ID: $contratoId" -ForegroundColor Cyan
        Write-Host "[INFO] Numero: $numeroContrato" -ForegroundColor Cyan
    }
    else {
        Write-Host "[ERRO] Nenhum contrato encontrado. Execute test_complete_flow.ps1 primeiro!" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "[ERRO] Erro ao buscar contratos: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ========================================
# PASSO 3: BAIXAR EXCEL V2
# ========================================

Write-Host "`nPASSO 3: Baixando Excel V2..." -ForegroundColor Yellow

$excelFile = Join-Path $outputDir "contrato_${contratoId}_V2.xlsx"

try {
    Invoke-WebRequest -Uri "$baseUrl/contratos/$contratoId/excel" `
        -Method GET `
        -Headers $headers `
        -OutFile $excelFile
    
    $fileInfo = Get-Item $excelFile
    Write-Host "[OK] Excel V2 baixado!" -ForegroundColor Green
    Write-Host "[INFO] Arquivo: $excelFile" -ForegroundColor Cyan
    Write-Host "[INFO] Tamanho: $([math]::Round($fileInfo.Length / 1KB, 2)) KB" -ForegroundColor Cyan
}
catch {
    Write-Host "[ERRO] Erro ao baixar Excel: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "[INFO] Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    exit 1
}

# ========================================
# PASSO 4: ABRIR ARQUIVO
# ========================================

Write-Host "`nPASSO 4: Deseja abrir o arquivo?" -ForegroundColor Yellow
Write-Host "1 - Sim" -ForegroundColor White
Write-Host "2 - Nao" -ForegroundColor White
$opcao = Read-Host "Escolha"

if ($opcao -eq "1") {
    Write-Host "[INFO] Abrindo Excel..." -ForegroundColor Cyan
    Start-Process $excelFile
    Write-Host "[OK] Arquivo aberto!" -ForegroundColor Green
}

# ========================================
# RESUMO
# ========================================

Write-Host "`n" -NoNewline
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "TESTE CONCLUIDO!" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Cyan

Write-Host "`n[OK] O Excel V2 foi gerado com sucesso!" -ForegroundColor Green
Write-Host "[INFO] Verifique se o layout e igual ao CONTRATO.xlsx original" -ForegroundColor Cyan
Write-Host "[INFO] Arquivo: $excelFile" -ForegroundColor White

Write-Host "`n"
