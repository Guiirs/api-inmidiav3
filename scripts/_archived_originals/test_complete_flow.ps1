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

try {
    $clientes = Invoke-RestMethod -Uri "$baseUrl/clientes" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop
    
    if ($clientes.clientes.Count -gt 0) {
        $clienteId = $clientes.clientes[0]._id
        $clienteNome = $clientes.clientes[0].nome
        Write-Success "Cliente encontrado: $clienteNome (ID: $clienteId)"
    }
    else {
        Write-Error "Nenhum cliente encontrado. Crie um cliente primeiro!"
        exit 1
    }
}
catch {
    Write-Error "Erro ao buscar clientes: $($_.Exception.Message)"
    exit 1
}

# ========================================
# PASSO 3: BUSCAR PLACAS
# ========================================

Write-Step "PASSO 3: Buscando placas disponíveis" "Yellow"

try {
    $placas = Invoke-RestMethod -Uri "$baseUrl/placas?status=disponivel&limit=5" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop
    
    if ($placas.placas.Count -gt 0) {
        $placasIds = $placas.placas | Select-Object -First 3 | ForEach-Object { $_._id }
        Write-Success "Placas encontradas: $($placasIds.Count)"
        $placas.placas | Select-Object -First 3 | ForEach-Object {
            Write-Info "  - $($_.numero_placa) ($($_.regiao.nome))"
        }
    }
    else {
        Write-Error "Nenhuma placa disponível. Crie placas primeiro!"
        exit 1
    }
}
catch {
    Write-Error "Erro ao buscar placas: $($_.Exception.Message)"
    exit 1
}

# ========================================
# PASSO 4: CRIAR PI
# ========================================

Write-Step "PASSO 4: Criando Proposta Interna (PI)" "Yellow"

$dataInicio = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")
$dataFim = (Get-Date).AddDays(31).ToString("yyyy-MM-dd")

$piData = @{
    clienteId = $clienteId
    tipoPeriodo = "mensal"
    dataInicio = $dataInicio
    dataFim = $dataFim
    valorTotal = 5000.00
    valorProducao = 500.00
    descricao = "TESTE AUTOMÁTICO - Campanha de teste $(Get-Date -Format 'dd/MM/yyyy HH:mm')"
    produto = "OUTDOOR 9x3"
    descricaoPeriodo = "MENSAL - TESTE AUTOMÁTICO"
    formaPagamento = "30/60 dias"
    placas = $placasIds
} | ConvertTo-Json

try {
    $piResponse = Invoke-RestMethod -Uri "$baseUrl/pis" `
        -Method POST `
        -Body $piData `
        -Headers $headers `
        -ErrorAction Stop
    
    $piId = $piResponse.pi._id
    $piCode = $piResponse.pi.pi_code
    
    Write-Success "PI criada com sucesso!"
    Write-Info "PI ID: $piId"
    Write-Info "PI Code: $piCode"
    Write-Info "Cliente: $clienteNome"
    Write-Info "Placas: $($placasIds.Count)"
    Write-Info "Valor Total: R$ 5.000,00"
    Write-Info "Período: $dataInicio até $dataFim"
}
catch {
    Write-Error "Erro ao criar PI: $($_.Exception.Message)"
    Write-Error "Detalhes: $($_.ErrorDetails.Message)"
    exit 1
}

# ========================================
# PASSO 5: CRIAR CONTRATO
# ========================================

Write-Step "PASSO 5: Criando Contrato" "Yellow"

$contratoData = @{
    piId = $piId
} | ConvertTo-Json

try {
    $contratoResponse = Invoke-RestMethod -Uri "$baseUrl/contratos" `
        -Method POST `
        -Body $contratoData `
        -Headers $headers `
        -ErrorAction Stop
    
    $contratoId = $contratoResponse.contrato._id
    $numeroContrato = $contratoResponse.contrato.numeroContrato
    
    Write-Success "Contrato criado com sucesso!"
    Write-Info "Contrato ID: $contratoId"
    Write-Info "Número: $numeroContrato"
}
catch {
    Write-Error "Erro ao criar contrato: $($_.Exception.Message)"
    Write-Error "Detalhes: $($_.ErrorDetails.Message)"
    exit 1
}

# ========================================
# PASSO 6: BAIXAR EXCEL
# ========================================

Write-Step "PASSO 6: Baixando Excel" "Yellow"

$excelFile = Join-Path $outputDir "contrato_${contratoId}.xlsx"

try {
    Invoke-WebRequest -Uri "$baseUrl/contratos/$contratoId/excel" `
        -Method GET `
        -Headers $headers `
        -OutFile $excelFile `
        -ErrorAction Stop
    
    $fileInfo = Get-Item $excelFile
    Write-Success "Excel baixado com sucesso!"
    Write-Info "Arquivo: $excelFile"
    Write-Info "Tamanho: $([math]::Round($fileInfo.Length / 1KB, 2)) KB"
}
catch {
    Write-Error "Erro ao baixar Excel: $($_.Exception.Message)"
}

# ========================================
# PASSO 7: BAIXAR PDF (via Excel)
# ========================================

Write-Step "PASSO 7: Baixando PDF (via Excel)" "Yellow"

$pdfExcelFile = Join-Path $outputDir "contrato_${contratoId}_via_excel.pdf"

try {
    Invoke-WebRequest -Uri "$baseUrl/contratos/$contratoId/pdf-excel" `
        -Method GET `
        -Headers $headers `
        -OutFile $pdfExcelFile `
        -ErrorAction Stop
    
    $fileInfo = Get-Item $pdfExcelFile
    Write-Success "PDF (via Excel) baixado com sucesso!"
    Write-Info "Arquivo: $pdfExcelFile"
    Write-Info "Tamanho: $([math]::Round($fileInfo.Length / 1KB, 2)) KB"
}
catch {
    Write-Error "Erro ao baixar PDF via Excel: $($_.Exception.Message)"
}

# ========================================
# PASSO 8: BAIXAR PDF (horizontal)
# ========================================

Write-Step "PASSO 8: Baixando PDF (horizontal PDFKit)" "Yellow"

$pdfFile = Join-Path $outputDir "contrato_${contratoId}_horizontal.pdf"

try {
    Invoke-WebRequest -Uri "$baseUrl/contratos/$contratoId/download" `
        -Method GET `
        -Headers $headers `
        -OutFile $pdfFile `
        -ErrorAction Stop
    
    $fileInfo = Get-Item $pdfFile
    Write-Success "PDF (horizontal) baixado com sucesso!"
    Write-Info "Arquivo: $pdfFile"
    Write-Info "Tamanho: $([math]::Round($fileInfo.Length / 1KB, 2)) KB"
}
catch {
    Write-Error "Erro ao baixar PDF horizontal: $($_.Exception.Message)"
}

# ========================================
# PASSO 9: VERIFICAR ARQUIVOS
# ========================================

Write-Step "PASSO 9: Verificando arquivos gerados" "Yellow"

$arquivos = @(
    @{ Nome = "Excel"; Caminho = $excelFile },
    @{ Nome = "PDF via Excel"; Caminho = $pdfExcelFile },
    @{ Nome = "PDF Horizontal"; Caminho = $pdfFile }
)

$sucessos = 0
$falhas = 0

foreach ($arquivo in $arquivos) {
    if (Test-Path $arquivo.Caminho) {
        $info = Get-Item $arquivo.Caminho
        $tamanho = [math]::Round($info.Length / 1KB, 2)
        
        if ($info.Length -gt 0) {
            Write-Success "$($arquivo.Nome): OK ($tamanho KB)"
            $sucessos++
        }
        else {
            Write-Error "$($arquivo.Nome): Arquivo vazio!"
            $falhas++
        }
    }
    else {
        Write-Error "$($arquivo.Nome): Arquivo não encontrado!"
        $falhas++
    }
}

# ========================================
# PASSO 10: ABRIR ARQUIVOS
# ========================================

Write-Step "PASSO 10: Deseja abrir os arquivos gerados?" "Yellow"
Write-Host "1 - Sim, abrir todos" -ForegroundColor White
Write-Host "2 - Não, apenas mostrar resumo" -ForegroundColor White
$opcao = Read-Host "Escolha"

if ($opcao -eq "1") {
    foreach ($arquivo in $arquivos) {
        if (Test-Path $arquivo.Caminho) {
            Write-Info "Abrindo $($arquivo.Nome)..."
            Start-Process $arquivo.Caminho
            Start-Sleep -Seconds 1
        }
    }
    Write-Success "Arquivos abertos!"
}

# ========================================
# RESUMO FINAL
# ========================================

Write-Host "`n" -NoNewline
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "RESUMO DO TESTE" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan

Write-Host "`nDADOS CRIADOS:" -ForegroundColor Green
Write-Host "   PI ID:        $piId" -ForegroundColor White
Write-Host "   PI Code:      $piCode" -ForegroundColor White
Write-Host "   Contrato ID:  $contratoId" -ForegroundColor White
Write-Host "   Número:       $numeroContrato" -ForegroundColor White
Write-Host "   Cliente:      $clienteNome" -ForegroundColor White
Write-Host "   Placas:       $($placasIds.Count)" -ForegroundColor White

Write-Host "`nDOCUMENTOS GERADOS:" -ForegroundColor Green
Write-Host "   Sucessos:     $sucessos / 3" -ForegroundColor White
Write-Host "   Falhas:       $falhas / 3" -ForegroundColor White

if ($sucessos -eq 3) {
    Write-Host "`nTESTE COMPLETADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "   Todos os documentos foram gerados corretamente!" -ForegroundColor Green
}
elseif ($sucessos -gt 0) {
    Write-Host "`nTESTE PARCIALMENTE CONCLUIDO" -ForegroundColor Yellow
    Write-Host "   Alguns documentos falharam. Verifique os erros acima." -ForegroundColor Yellow
}
else {
    Write-Host "`nTESTE FALHOU" -ForegroundColor Red
    Write-Host "   Nenhum documento foi gerado. Verifique os erros." -ForegroundColor Red
}

Write-Host "`nLOCALIZACAO DOS ARQUIVOS:" -ForegroundColor Cyan
Write-Host "   $outputDir" -ForegroundColor White

Write-Host "`nPROXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "   1. Abra os arquivos e verifique se os dados estao corretos" -ForegroundColor White
Write-Host "   2. Confira se todos os campos foram preenchidos" -ForegroundColor White
Write-Host "   3. Teste com diferentes cenarios (mais placas, valores, etc.)" -ForegroundColor White
Write-Host "   4. Integre no frontend React" -ForegroundColor White

Write-Host "`n" -NoNewline
Write-Host "=" * 70 -ForegroundColor Cyan

# ========================================
# INFORMAÇÕES ÚTEIS
# ========================================

Write-Host "`nINFORMACOES UTEIS:" -ForegroundColor Cyan
Write-Host "   - Para deletar PI:        DELETE $baseUrl/pis/$piId" -ForegroundColor Gray
Write-Host "   - Para deletar Contrato:  DELETE $baseUrl/contratos/$contratoId" -ForegroundColor Gray
Write-Host "   - Logs do backend:        BECKEND/logs/combined.log" -ForegroundColor Gray

Write-Host "`n"
